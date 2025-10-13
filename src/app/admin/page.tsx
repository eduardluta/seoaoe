// src/app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic"; // always fetch fresh on each load

export default async function AdminPage() {
  // get the latest 20 runs
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      keyword: true,
      domain: true,
      country: true,
      language: true,
      createdAt: true,
      cacheHit: true,
    },
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin — Recent Runs</h1>
        <Link href="/" className="underline">Back to form</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b">Created</th>
              <th className="text-left p-2 border-b">Keyword</th>
              <th className="text-left p-2 border-b">Domain</th>
              <th className="text-left p-2 border-b">Country</th>
              <th className="text-left p-2 border-b">Language</th>
              <th className="text-left p-2 border-b">Run ID</th>
              <th className="text-left p-2 border-b">Cache</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="p-2 border-b">{r.keyword}</td>
                <td className="p-2 border-b">{r.domain}</td>
                <td className="p-2 border-b">{r.country}</td>
                <td className="p-2 border-b">{r.language}</td>
                <td className="p-2 border-b font-mono text-xs">{r.id}</td>
                <td className="p-2 border-b">{r.cacheHit ? "yes" : "no"}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No runs yet. Submit something from the home page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

