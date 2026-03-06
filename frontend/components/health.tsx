"use client";

import type React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

/**
 * Props for the HealthIndicator component.
 */
interface HealthIndicatorProps {
  isOnline: boolean;
  /** Set to true when an active heartbeat/ping check is in progress */
  isChecking: boolean;
}

/**
 * A visual status badge that indicates the real-time health of the backend API.
 * Displays a pulsing dot (Green for Online, Red for Offline) or a spinner during checks.
 */
export function HealthIndicator({
  isOnline,
  isChecking,
}: HealthIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
            {isChecking ? (
              // Display a spinning loader during the "checking" state
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              // Status dot with shadow pulse effect
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                }`}
              />
            )}
            <span className="text-xs font-medium text-foreground">
              API: {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Automatic health check every 10 seconds</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
