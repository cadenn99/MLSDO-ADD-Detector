"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  FileJson,
  Loader2,
  Download,
  Copy,
  Check,
} from "lucide-react";

import { getIssueById } from "@/lib/api";

/**
 * Generic type for the raw JSON document returned by the API.
 */
type IssueDocument = Record<string, unknown>;

/**
 * IssueDetailPage Component
 * * A dynamic route page that fetches and displays the full raw data of a specific
 * issue using its unique ID from the URL parameters.
 * * Features:
 * - Real-time fetching based on URL ID.
 * - One-click "Copy to Clipboard" functionality.
 * - JSON file download capability.
 * - Scrollable, syntax-highlighted (monospaced) JSON viewer.
 * * @component
 */
export default function IssueDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // State Management
  const [issue, setIssue] = useState<IssueDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Effect: Fetch issue data on component mount or when the ID changes.
   */
  useEffect(() => {
    async function fetchIssue() {
      setIsLoading(true);
      setError(null);

      const response = await getIssueById(id);
      console.log(response);
      if (response.success && response.data) {
        setIssue(response.data);
      } else {
        setError(response.error || "Failed to load issue");
      }

      setIsLoading(false);
    }

    if (id) {
      fetchIssue();
    }
  }, [id]);

  /**
   * Copies the formatted JSON string of the issue to the system clipboard.
   */
  const handleCopy = async () => {
    if (!issue) return;
    await navigator.clipboard.writeText(JSON.stringify(issue, null, 2));
    setCopied(true);
    // Reset "Copied" text after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Generates a .json file blob and triggers a browser download.
   */
  const handleDownload = () => {
    if (!issue) return;
    const blob = new Blob([JSON.stringify(issue, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `issue_${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[900px] mx-auto px-4 py-8">
        {/* Loading State UI */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading issue...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          /* Error State UI */
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : issue ? (
          /* Main Data Display */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                    <FileJson className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Issue Details</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5 truncate max-w-[400px]">
                      {id}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5 bg-transparent cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-1.5 bg-transparent cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {/* Raw JSON Code Block */}
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
                {JSON.stringify(issue, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
