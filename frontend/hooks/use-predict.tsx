"use client";

import { useState } from "react";
import {
  getRandomIssue,
  pollForResult,
  predictClassification,
} from "@/lib/api";

export interface BatchResult {
  summary: string;
  description: string;
  prediction: {
    sentiment: 0 | 1;
    label: "ADD" | "NOT_ADD";
  };
}

/**
 * Hook for batch classification logic.
 * Expects Jira JSON input and performs parallel API calls.
 */
export function usePredict() {
  const [inputData, setInputData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parses text input into an array of summary/description objects.
   */
  const parseInput = (data: string) => {
    try {
      const parsed = JSON.parse(data.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items
        .filter((item) => item.fields?.summary && item.fields?.description)
        .map((item) => ({
          summary: item.fields.summary,
          description: item.fields.description,
        }));
    } catch {
      return [];
    }
  };

  /**
   * Executes predictions for all parsed items in parallel.
   */
  const handlePredict = async () => {
    setInputData("");
    setResults([]);
    setError(null);

    const items = parseInput(inputData);
    if (items.length === 0) {
      setError(
        "Invalid JSON format. Please provide summary and description fields.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const predictions = await Promise.all(
        items.map(async (item) => {
          let response = await predictClassification(
            item.summary,
            item.description,
          );

          if (!response.data?.task_id)
            throw new Error("Prediction request failed");

          const response_polling = await pollForResult(response.data?.task_id);
          return {
            summary: item.summary,
            description: item.description,
            prediction: {
              sentiment: response_polling ?? 0,
              label: (response_polling === 1 ? "ADD" : "NOT_ADD") as
                | "ADD"
                | "NOT_ADD",
            },
          };
        }),
      );
      setResults(predictions);
    } catch (e) {
      setError("Prediction failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomIssue = async () => {
    setIsLoadingRandom(true);
    const res = await getRandomIssue();
    if (res.success) setInputData(JSON.stringify(res.data, null, 2));
    setIsLoadingRandom(false);
  };

  return {
    inputData,
    setInputData,
    isLoading,
    isLoadingRandom,
    results,
    error,
    handlePredict,
    handleRandomIssue,
    reset: () => {
      setInputData("");
      setResults([]);
      setError(null);
    },
  };
}
