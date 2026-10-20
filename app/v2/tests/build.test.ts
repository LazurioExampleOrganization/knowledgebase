import { describe, expect, test } from "bun:test";
import { rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import packageJson from "../package.json";

// The build contract of the Lazurio Module Standard (kap. 4.5): opened from
// `main`, the App runs as its build. The Launchpad runs `build_script` with only
// bun on PATH, `NODE_ENV=production` and no listener, then serves
// `build_output` with its own static server; the declared health path must
// resolve to a file of the output directly (a path ending in `/` to its
// `index.html`), because the probe does not follow redirects.
const app = resolve(import.meta.dir, "..");
const runtime = packageJson.lazurio.runtime;
const [entrypoint] = runtime.listeners;
if (!entrypoint) throw new Error("lazurio.runtime declares no listener");
const output = join(app, runtime.build_output);
const buildTimeoutMs = 120_000;

describe("build contract", () => {
  test(
    "builds without the listener environment and serves the health path as a file",
    () => {
      // As the Launchpad does, so that an earlier build never passes for this one.
      rmSync(output, { recursive: true, force: true });
      const run = Bun.spawnSync([process.execPath, "--no-env-file", "run", runtime.build_script], {
        cwd: app,
        env: {
          HOME: process.env.HOME ?? "",
          PATH: dirname(process.execPath),
          NODE_ENV: "production",
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      if (run.exitCode !== 0) console.error(run.stderr.toString());
      expect(run.exitCode).toBe(0);
      const path = entrypoint.health.path;
      const files = path.endsWith("/") ? [`${path}index.html`] : [path, `${path}.html`];
      expect(files.some((file) => isFile(join(output, file)))).toBe(true);
    },
    buildTimeoutMs,
  );
});

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}
