"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Activity, Sun, Moon, ArrowLeft } from "lucide-react";
import { HealthIndicator } from "@/components/health";
import { useApp } from "@/contexts/app-context";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { usePathname } from "next/navigation";

/**
 * The primary Header component for the application.
 * Handles theme switching, breadcrumb-style navigation, and health status display.
 * * @requires useApp - Relies on global context for theme and connectivity state.
 */
export default function Header() {
  const { isOnline, isChecking, isDark, toggleTheme } = useApp();
  const pathname = usePathname();

  /** Logic to hide the back button when on the root dashboard */
  const isHomePage =
    pathname === "/" || pathname === "/?warpgate-target=Group 4 HTTP Frontend";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-[900px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Only show 'Back' button if the user has navigated away from home */}
          {!isHomePage && (
            <Link href="/?warpgate-target=Group 4 HTTP Frontend">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 bg-transparent cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* Application Branding */}
          <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
            <Activity className="h-4 w-4 text-background" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              ADD Classifier
            </h1>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              Architectural Design Decision Detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTheme()}
                  className="h-8 w-8 cursor-pointer"
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle {isDark ? "light" : "dark"} mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Integrated Connectivity Status */}
          <HealthIndicator
            isOnline={isOnline || false}
            isChecking={isChecking || false}
          />
        </div>
      </div>
    </header>
  );
}
