#!/usr/bin/env node
/**
 * Post-install setup for @elizaos/plugin-browser:
 *
 * 1. Symlinks the installed package's `dist/server` to the workspace's
 *    stagehand-server source (the npm package doesn't ship the server).
 *
 * 2. Patches the process-manager to remove Docker-specific env defaults
 *    that break local environments (OLLAMA_BASE_URL=http://ollama:11434).
 *
 * Run automatically via the `postinstall` hook, or manually:
 *   node scripts/link-browser-server.mjs
 */
import {
  existsSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const milaidyRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(milaidyRoot, "..");

// ── 1. Symlink stagehand-server ──────────────────────────────────────────────

const stagehandDir = join(
  workspaceRoot,
  "plugins",
  "plugin-browser",
  "stagehand-server",
);
const stagehandIndex = join(stagehandDir, "dist", "index.js");

// Resolve the plugin-browser package location
let pluginRoot;
try {
  const req = createRequire(join(milaidyRoot, "package.json"));
  const pkgJson = req.resolve("@elizaos/plugin-browser/package.json");
  pluginRoot = dirname(pkgJson);
} catch {
  console.log(
    "[link-browser-server] @elizaos/plugin-browser not installed — skipping",
  );
  process.exit(0);
}

if (existsSync(stagehandIndex)) {
  const serverLink = join(pluginRoot, "dist", "server");

  let needsLink = true;
  if (existsSync(serverLink)) {
    try {
      const target = readlinkSync(serverLink);
      if (target === stagehandDir) {
        console.log("[link-browser-server] Symlink already up to date");
        needsLink = false;
      } else {
        // Stale symlink — remove and recreate
        unlinkSync(serverLink);
      }
    } catch {
      // Not a symlink (real directory) — leave it alone
      console.log(
        "[link-browser-server] dist/server already exists as a directory — skipping symlink",
      );
      needsLink = false;
    }
  }

  if (needsLink) {
    try {
      symlinkSync(stagehandDir, serverLink, "dir");
      console.log(
        `[link-browser-server] Linked: ${serverLink} -> ${stagehandDir}`,
      );
    } catch (err) {
      console.error(
        `[link-browser-server] Failed to create symlink: ${err}`,
      );
    }
  }
} else {
  console.log(
    `[link-browser-server] Stagehand server not found at ${stagehandDir} — skipping symlink`,
  );
}

// ── 2. Patch process-manager env defaults ────────────────────────────────────
// The npm package's process-manager.js injects Docker-specific defaults
// (OLLAMA_BASE_URL=http://ollama:11434, DISPLAY=:99) which break non-Docker
// environments.  Replace the env block with a clean pass-through.

const pmPath = join(pluginRoot, "dist", "services", "process-manager.js");
if (existsSync(pmPath)) {
  let src = readFileSync(pmPath, "utf8");

  // Only patch if the Docker default is still present
  if (src.includes('"http://ollama:11434"')) {
    // Replace the env object construction with clean pass-through
    src = src.replace(
      /const env = \{[^}]*OLLAMA_BASE_URL[^}]*\};/s,
      `const env = {
                ...process.env,
                BROWSER_SERVER_PORT: this.serverPort.toString(),
                NODE_ENV: process.env.NODE_ENV ?? "production",
            };`,
    );
    writeFileSync(pmPath, src, "utf8");
    console.log("[link-browser-server] Patched process-manager.js (removed Docker env defaults)");
  } else {
    console.log("[link-browser-server] process-manager.js already patched");
  }
} else {
  console.log("[link-browser-server] process-manager.js not found — skipping patch");
}
