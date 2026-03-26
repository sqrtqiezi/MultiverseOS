import type { Step } from "../api";

const KIND_ICONS: Record<string, string> = {
  file_edit: "E",
  tool_call: "T",
  subagent: "A",
  user_prompt: "P",
  test: "X",
};

export function StepCard({ step }: { step: Step }) {
  const time = step.startedAt.split("T")[1]?.slice(0, 8) ?? "";
  const icon = KIND_ICONS[step.kind] ?? "?";
  const duration =
    step.endedAt && step.startedAt
      ? ((new Date(step.endedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1) + "s"
      : null;

  return (
    <div className="flex items-start gap-3 py-2 px-3 hover:bg-gray-50 rounded">
      <div className="text-xs text-gray-400 font-mono w-16 pt-0.5">{time}</div>
      <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-xs font-bold text-gray-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{step.summary || step.toolName || step.kind}</div>
        <div className="text-xs text-gray-400 flex gap-3">
          {step.toolName && <span>{step.toolName}</span>}
          {duration && <span>{duration}</span>}
          {step.costUsd != null && <span>${step.costUsd.toFixed(3)}</span>}
        </div>
      </div>
    </div>
  );
}
