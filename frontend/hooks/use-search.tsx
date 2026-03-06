"use client";

import { useState } from "react";
import { searchKeyword } from "@/lib/api";

/**
 * Hook to manage keyword-based document lookup.
 * Handles query state, API fetching, and JSON file exports.
 */
export function useSearch() {
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  /**
   * Fetches document IDs matching the current keyword.
   */
  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setError(null);
    setSearched(true);

    const res = await searchKeyword(keyword.trim());
    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setError(res.error || "Search failed");
      setResults([]);
    }
    setIsLoading(false);
  };

  /**
   * Triggers a browser download of the current results as a JSON file.
   */
  const exportResults = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search_${keyword}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    keyword, setKeyword, isLoading, results, error, searched,
    handleSearch, exportResults, reset: () => { setKeyword(""); setResults([]); setSearched(false); }
  };
}