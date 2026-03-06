"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  AlertCircle,
  Loader2,
  RotateCcw,
  Download,
  Layers,
  Shuffle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { usePredict } from "@/hooks/use-predict";

/**
 * View layer for issue classification.
 * Renders JSON input and the original list of results.
 */
export function PredictTab({ isOnline }: { isOnline: boolean }) {
  const {
    inputData,
    setInputData,
    isLoading,
    isLoadingRandom,
    results,
    error,
    handlePredict,
    handleRandomIssue,
    reset,
  } = usePredict();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Predict!
          </CardTitle>
          <CardDescription>
            Paste issues as JSON to get predictions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="input">Input JSON</Label>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleRandomIssue}
                disabled={!isOnline || isLoadingRandom}
              >
                {isLoadingRandom ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Shuffle className="h-3 w-3 mr-1" />
                )}
                Random Issue
              </Button>
            </div>
            <Textarea
              id="input"
              value={inputData}
              placeholder={`Single issue:\n{ "fields": { "summary": "...", "description": "...", ...}, ... }\n\nOr multiple issues:\n[\n  { "fields": { "summary": "...", "description": "...", ...}, ... },\n  { "fields": { "summary": "...", "description": "...", ...}, ... }\n]`}
              onChange={(e) => setInputData(e.target.value)}
              className="min-h-[200px] font-mono text-sm max-h-[400px] overflow-y-auto"
            />
          </div>

          {!isOnline && (
            <Alert variant="destructive">
              <AlertTitle>API Offline</AlertTitle>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePredict}
              className="cursor-pointer"
              disabled={!isOnline || isLoading || !inputData.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Predict
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              className="bg-transparent cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Results ({results.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto">
            {results.map((result, index) => {
              const isADD = result.prediction.sentiment === 1;
              return (
                <div
                  key={index}
                  className={`rounded-lg border-2 overflow-hidden ${isADD ? "border-emerald-500/50 bg-emerald-500/5" : "border-red-500/50 bg-red-500/5"}`}
                >
                  <div
                    className={`flex items-center gap-3 px-4 py-3 ${isADD ? "bg-emerald-500/10" : "bg-red-500/10"}`}
                  >
                    {isADD ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span
                      className={`font-semibold ${isADD ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {isADD ? "ADD Detected" : "Not ADD"}
                    </span>
                    <Badge className="ml-auto" variant="outline">
                      {result.prediction.label}
                    </Badge>
                  </div>
                  <div className="px-4 py-2 border-b border-border/50">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      Summary
                    </p>
                    <p className="text-sm font-medium">{result.summary}</p>
                  </div>
                  <pre className="p-4 text-xs font-mono">
                    <p className="text-muted-foreground uppercase mb-1">
                      Description
                    </p>
                    {result.description}
                  </pre>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
