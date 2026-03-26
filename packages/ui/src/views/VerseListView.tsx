import { useEffect, useState } from "react";
import { fetchVerses, fetchRuns, type Verse, type Run } from "../api";

interface VerseWithRuns extends Verse {
  runs: Run[];
}

export function VerseListView({ onSelectRun }: { onSelectRun: (runId: string) => void }) {
  const [verses, setVerses] = useState<VerseWithRuns[]>([]);
  const [orphanRuns, setOrphanRuns] = useState<Run[]>([]);

  useEffect(() => {
    Promise.all([fetchVerses(), fetchRuns()]).then(([vs, allRuns]) => {
      const verseRuns = vs.map((v) => ({
        ...v,
        runs: allRuns.filter((r) => r.verseId === v.id),
      }));
      setVerses(verseRuns);
      setOrphanRuns(allRuns.filter((r) => !r.verseId));
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">MultiverseOS</h1>
      <h2 className="text-lg font-semibold mb-4">Verses</h2>

      {verses.length === 0 && orphanRuns.length === 0 && (
        <p className="text-gray-500">No data yet. Start a Claude Code session to begin collecting.</p>
      )}

      <div className="space-y-3">
        {verses.map((v) => (
          <div key={v.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{v.name}</span>
                <span className="ml-2 text-sm text-gray-500">{v.gitBranch}</span>
              </div>
              <div className="text-sm text-gray-500">
                {v.runs.length} runs |
                ${v.runs.reduce((s, r) => s + (r.totalCostUsd ?? 0), 0).toFixed(2)}
              </div>
            </div>
            {v.runs.length > 0 && (
              <div className="mt-2 space-y-1">
                {v.runs.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRun(r.id)}
                    className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-blue-50"
                  >
                    {r.id.slice(0, 16)}... {r.status} {r.startedAt.split("T")[0]}
                    {r.totalCostUsd != null && ` $${r.totalCostUsd.toFixed(2)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {orphanRuns.length > 0 && (
          <div className="border rounded-lg p-4 border-dashed">
            <div className="font-medium text-gray-500">Unbound Runs</div>
            <div className="mt-2 space-y-1">
              {orphanRuns.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRun(r.id)}
                  className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-blue-50"
                >
                  {r.id.slice(0, 16)}... {r.status} {r.gitBranch ?? "-"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
