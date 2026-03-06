"use client";

import type React from "react";
import Link from "next/link";
import {
  ChevronRight,
  AlertCircle,
  Loader2,
  RotateCcw,
  Download,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearch } from "@/hooks/use-search";

/**
 * Search interface for finding specific Document IDs by keyword.
 * @param isOnline - API connection status.
 */
export function SearchTab({ isOnline }: { isOnline: boolean }) {
  const {
    keyword,
    setKeyword,
    isLoading,
    results,
    error,
    searched,
    handleSearch,
    exportResults,
    reset,
  } = useSearch();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Keyword Search
          </CardTitle>
          <CardDescription>
            Search for issues by keyword to find relevant architectural
            decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Search Keyword</Label>
            <Input
              id="keyword"
              placeholder="Enter keyword to search (e.g., database, authentication, API)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {!isOnline && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>API Offline</AlertTitle>
              <AlertDescription>
                The search API is currently unavailable.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSearch}
              disabled={!isOnline || isLoading || !keyword.trim()}
              className="cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              className="bg-transparent cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Clear
            </Button>
            {results.length > 0 && (
              <Button
                variant="ghost"
                onClick={exportResults}
                className="ml-auto cursor-pointer"
              >
                <Download className="h-4 w-4 mr-2" /> Export Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Search Results ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {results.map((id) => (
                  <Link
                    key={id}
                    href={`/issue/${id}?warpgate-target=Group 4 HTTP Frontend`}
                    className="p-3 border rounded-md bg-muted/30 font-mono text-xs flex items-center justify-between hover:bg-accent transition-all group"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Document ID
                      </span>
                      <span className="font-medium text-foreground group-hover:text-primary">
                        {id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="text-[10px] opacity-70"
                      >
                        VIEW DETAILS
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No IDs found for "{keyword}"
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
