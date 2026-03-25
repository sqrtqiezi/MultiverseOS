import { readStdin, buildPayload, sendEvent, getGitBranch } from "./common.js";

const stdin = await readStdin();
const payload = buildPayload("Stop", stdin);
payload.git_branch = await getGitBranch(payload.cwd);
await sendEvent(payload);
