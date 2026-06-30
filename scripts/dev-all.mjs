#!/usr/bin/env node
/**
 * dev-all — start the mock API server and the Next dev server together with one
 * command (`npm run dev:all`), so the app always has its backend.
 *
 * Dependency-free: just spawns two child processes, prefixes their output, and
 * tears both down on exit. The two-terminal flow (`npm run mock` + `npm run
 * dev`) still works exactly as before; this is a convenience wrapper.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mockDir = join(root, "mock-server");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const children = [];
let shuttingDown = false;

function prefix(name, color, stream, isError) {
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  let buf = "";
  stream.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) (isError ? process.stderr : process.stdout).write(tag + line + "\n");
  });
}

function start(name, color, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, env: process.env });
  prefix(name, color, child.stdout, false);
  prefix(name, color, child.stderr, true);
  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`\x1b[${color}m[${name}]\x1b[0m exited (code ${code}); shutting down.`);
      shutdown();
    }
  });
  children.push(child);
  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(0), 300);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Ensure the mock server's dependencies are installed before starting it.
if (!existsSync(join(mockDir, "node_modules"))) {
  console.log("[setup] Installing mock-server dependencies (first run)…");
  const install = spawn(npm, ["install"], { cwd: mockDir, stdio: "inherit" });
  install.on("exit", (code) => {
    if (code !== 0) {
      console.error("[setup] mock-server install failed.");
      process.exit(code ?? 1);
    }
    launch();
  });
} else {
  launch();
}

function launch() {
  // 33 = yellow (mock), 36 = cyan (app)
  start("mock", "33", "node", ["server.js"], mockDir);
  start("app", "36", npm, ["run", "dev"], root);
}
