#!/usr/bin/env node
import { runCli } from "./cliCore.js";

runCli().then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error: unknown) => {
  console.error("depshift-tailwind failed:");
  console.error(error);
  process.exitCode = 1;
});
