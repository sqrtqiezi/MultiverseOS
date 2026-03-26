import { useEffect, useState } from "react";
import { fetchTimeline, type Step } from "../api";
import { StepCard } from "../components/StepCard";

export function TimelineView({ runId }: { runId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline(runId)
      .then(setSteps)
      .finally(() => setLoading(false));
  }, [runId]);

  const totalCost = steps.reduce((s, st) => s + (st.costUsd ?? 0), 0);
  const totalTokens = steps.reduce((s, st) => s + (st.tokens ?? 0), 0);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-1">Run Timeline</h2>
      <p className="text-sm text-gray-500 mb-4">
        {runId} | {steps.length} steps | ${totalCost.toFixed(2)} | {totalTokens.toLocaleString()} tokens
      </p>

      {steps.length === 0 ? (
        <p className="text-gray-400">No steps recorded.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
