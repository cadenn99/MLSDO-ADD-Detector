"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Search } from "lucide-react";
import { useApp } from "@/contexts/app-context";
import { PredictTab } from "@/components/dashboard/predict-tab";
import { SearchTab } from "@/components/dashboard/search-tab";
/**
 * AddClassifierContent
 * * The internal layout for the Architectural Design Decision (ADD) Classifier.
 * Manages the high-level tab navigation between the Prediction and Search features.
 * * @component
 */
function AddClassifierContent() {
  /** Accesses global app state to determine if API services are reachable */
  const { isOnline } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[900px] mx-auto px-4 py-8">
        {/* Main Navigation Tabs */}
        <Tabs defaultValue="predict" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30">
            {/* Predict Tab Trigger: For classifying new issue data */}
            <TabsTrigger
              value="predict"
              className="gap-2 data-[state=active]:bg-muted/80 data-[state=active]:text-foreground cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              Predict
            </TabsTrigger>

            {/* Search Tab Trigger: For looking up existing Document IDs by keyword */}
            <TabsTrigger
              value="search"
              className="gap-2 data-[state=active]:bg-muted/80 data-[state=active]:text-foreground cursor-pointer"
            >
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Predict Feature View */}
          <TabsContent value="predict">
            <PredictTab isOnline={isOnline} />
          </TabsContent>

          {/* Search Feature View */}
          <TabsContent value="search">
            <SearchTab isOnline={isOnline} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/**
 * AddClassifier
 * * The root component for the ADD Classifier dashboard.
 * Wrapped in Suspense to handle potential hydration or data fetching delays.
 * * @component
 */
export default function AddClassifier() {
  return (
    <Suspense fallback={null}>
      <AddClassifierContent />
    </Suspense>
  );
}
