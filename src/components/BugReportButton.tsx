"use client";

import { useState } from "react";

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint
      await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setName("");
        setDescription("");
        setIsSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting bug report:", error);
      alert("Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative h-14 overflow-hidden rounded-full bg-amber-500 shadow-xl transition-all duration-300 hover:w-48 hover:bg-amber-600 w-14"
          aria-label="Report a bug"
        >
          {/* Bug Icon */}
          <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* CTA Text (visible on hover) */}
          <span className="absolute left-14 top-0 flex h-14 items-center whitespace-nowrap pr-4 text-sm font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Report a Bug
          </span>
        </button>
      </div>

      {/* Modal/Form */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">Report a Bug</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Close"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isSubmitted ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg
                    className="h-8 w-8 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-black">
                  Thank you for your feedback!
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  We&apos;ll look into this issue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label
                    htmlFor="bug-name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Name
                  </label>
                  <input
                    id="bug-name"
                    type="text"
                    required
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Description Field */}
                <div>
                  <label
                    htmlFor="bug-description"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="bug-description"
                    required
                    rows={5}
                    placeholder="Describe the bug you encountered..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border-2 border-amber-500 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-lg bg-amber-500 text-base font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Bug Report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
