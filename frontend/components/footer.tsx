import React from "react";

/**
 * Simple site footer containing the application version/tagline.
 * Maintains consistent max-width with the Header component.
 */
export default function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-8">
      <div className="max-w-[900px] mx-auto px-4 text-center">
        <p className="text-xs text-muted-foreground">
          {/* Copyright or project description */}
          ADD Classifier - Detect Architectural Design Decisions in issue
          trackers
        </p>
      </div>
    </footer>
  );
}
