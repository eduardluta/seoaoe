// src/app/page.tsx
"use client";

import { useState } from "react";

type RunResponse =
  | { run_id: string; status: string; created_at: string }
  | { error: string };

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          domain,
          country,
          language,
          email: email || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) setError(json?.error || "Request failed");
      else setResult(json);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">SEO-AOE — AI Visibility Checker (MVP)</h1>

      <form onSubmit={onSubmit} className="grid gap-4 max-w-3xl">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Keyword</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="SEO Agentur"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Domain (no http://)</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="mikgroup.ch"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Country (ISO-2)</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="CH"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Language (BCP-47)</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="de"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Email (optional, for PDF)</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white rounded px-4 py-2 w-max disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Checking…" : "Check LLMs"}
        </button>
      </form>

      <section className="mt-8">
        {error && (
          <div className="text-red-600">
            <b>Error:</b> {error}
          </div>
        )}
        {result && "run_id" in result && (
          <div className="text-green-700">
            <div><b>Run ID:</b> {result.run_id}</div>
            <div><b>Status:</b> {result.status}</div>
            <div><b>Created:</b> {new Date(result.created_at).toLocaleString()}</div>
          </div>
        )}
      </section>
    </main>
  );
}
