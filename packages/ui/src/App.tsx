import { useState } from "react";
import { VerseListView } from "./views/VerseListView";
// TimelineView will be added in Task 12

function App() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  if (selectedRunId) {
    return (
      <div className="min-h-screen bg-white">
        <button
          onClick={() => setSelectedRunId(null)}
          className="p-4 text-blue-600 hover:underline"
        >
          Back to verses
        </button>
        <div className="p-6">
          <p>Timeline for {selectedRunId} (next task)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <VerseListView onSelectRun={setSelectedRunId} />
    </div>
  );
}

export default App;
