import { useState } from "react";
import { VerseListView } from "./views/VerseListView";
import { TimelineView } from "./views/TimelineView";

function App() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {selectedRunId ? (
        <>
          <button
            onClick={() => setSelectedRunId(null)}
            className="p-4 text-blue-600 hover:underline text-sm"
          >
            &larr; Back to verses
          </button>
          <TimelineView runId={selectedRunId} />
        </>
      ) : (
        <VerseListView onSelectRun={setSelectedRunId} />
      )}
    </div>
  );
}

export default App;
