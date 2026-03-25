import { Command } from "commander";
import { startServer } from "../server.js";
import { join } from "path";

export const serveCommand = new Command("serve")
  .description("Start HTTP server for event ingestion and API")
  .option("-p, --port <port>", "Port to listen on", "7777")
  .action((opts) => {
    const dbPath = join(".multiverseos", "multiverseos.db");
    const port = parseInt(opts.port, 10);
    startServer({ port, dbPath });
  });
