"use client";

import { useState } from "react";

type DownloadButtonProps = {
  runId: string;
  isProcessing: boolean;
};

export function DownloadButton({ runId, isProcessing }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (isProcessing) {
      alert("Please wait for all providers to complete processing before generating the report.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/report/${runId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      // Download the PDF
      window.open(data.pdfUrl, "_blank");

      // Show success message
      if (data.emailSent) {
        alert("Report generated! PDF downloaded and email sent successfully.");
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to generate report"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading || isProcessing}
      className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? "Generating..." : "📄 Download Report"}
    </button>
  );
}
