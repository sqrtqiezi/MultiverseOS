#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { serveCommand } from "./commands/serve.js";

const program = new Command();
program.name("verse").description("MultiverseOS — experiment management for Claude Code").version("0.1.0");
program.addCommand(initCommand);
program.addCommand(serveCommand);
program.parse();
