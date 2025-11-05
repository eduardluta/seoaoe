"use client";

import { useState } from "react";

type Tab = "runs" | "bugs";

interface AdminTabsProps {
  runsContent: React.ReactNode;
  bugsContent: React.ReactNode;
}

export function AdminTabs({ runsContent, bugsContent }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("runs");

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 border-b border-neutral-300 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab("runs")}
          className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === "runs"
              ? "text-amber-600 dark:text-amber-400"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          Visibility Checks
          {activeTab === "runs" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("bugs")}
          className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === "bugs"
              ? "text-amber-600 dark:text-amber-400"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          Bug Reports
          {activeTab === "bugs" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "runs" && runsContent}
        {activeTab === "bugs" && bugsContent}
      </div>
    </div>
  );
}
