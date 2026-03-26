import { Command } from "commander";
import { execSync } from "node:child_process";

export const uiCommand = new Command("ui")
  .description("Open MultiverseOS UI in browser")
  .option("-p, --port <port>", "Server port", "7777")
  .action((opts) => {
    const url = `http://127.0.0.1:${opts.port}`;
    try {
      // Linux
      execSync(`xdg-open ${url}`, { stdio: "ignore" });
    } catch {
      try {
        // macOS
        execSync(`open ${url}`, { stdio: "ignore" });
      } catch {
        console.log(`Open ${url} in your browser`);
      }
    }
  });
