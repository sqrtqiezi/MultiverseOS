import { ulid } from "ulid";

export const newVerseId = () => `verse_${ulid()}`;
export const newRunId = () => `run_${ulid()}`;
export const newStepId = () => `step_${ulid()}`;
export const newEventId = () => `evt_${ulid()}`;
export const newArtifactId = () => `art_${ulid()}`;
