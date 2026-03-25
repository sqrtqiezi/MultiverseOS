#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { serveCommand } from "./commands/serve.js";
import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { forkCommand } from "./commands/fork.js";
import { diffCommand } from "./commands/diff.js";

const program = new Command();
program.name("verse").description("MultiverseOS — experiment management for Claude Code").version("0.1.0");
program.addCommand(initCommand);
program.addCommand(serveCommand);
program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(forkCommand);
program.addCommand(diffCommand);
program.parse();
