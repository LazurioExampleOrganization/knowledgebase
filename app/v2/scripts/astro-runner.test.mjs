import { EventEmitter } from "node:events";
import { describe, expect, test } from "bun:test";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createAstroInvocations,
  resolveAstroEntry,
  runAstroTask,
} from "./astro-runner.mjs";

const WINDOWS_RUNTIME = String.raw`C:\Program Files\Bun\bun.exe`;
const WINDOWS_ASTRO = String.raw`C:\workspace\app\v2\node_modules\astro\astro.js`;

describe("portable Astro runner", () => {
  test("resolves Astro from a hoisted workspace package and its declared bin", () => {
    const packageJsonPath = join(process.cwd(), "workspace", "node_modules", "astro", "package.json");
    const resolved = resolveAstroEntry({
      resolvePackageJson: () => pathToFileURL(packageJsonPath).href,
      readPackageJson: () => ({ bin: { astro: "astro.js" } }),
    });

    expect(resolved).toBe(resolve(dirname(packageJsonPath), "astro.js"));
  });

  test("dev uses the module listener and current JavaScript entrypoint", () => {
    const [current] = createAstroInvocations("dev", {
      execPath: WINDOWS_RUNTIME,
      astroEntry: WINDOWS_ASTRO,
      listener: { host: "127.0.0.1", port: 6001 },
    });

    expect(current).toEqual({
      command: WINDOWS_RUNTIME,
      args: [
        WINDOWS_ASTRO,
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        "6001",
      ],
    });
    expect(current.command.endsWith(".cmd")).toBe(false);
    expect(current.args[0].endsWith("astro.js")).toBe(true);
  });

  test("preview reads its exact host and port from the module listener", () => {
    const [current] = createAstroInvocations("preview", {
      execPath: WINDOWS_RUNTIME,
      astroEntry: WINDOWS_ASTRO,
      listener: { host: "127.0.0.1", port: 6123 },
    });

    expect(current.args).toEqual([
      WINDOWS_ASTRO,
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "6123",
    ]);
    expect(current.args).not.toContain("--strictPort");
  });

  for (const task of ["dev", "preview"]) {
    test(`${task} verifies its exact manifest address before spawning`, async () => {
      const checked = [];
      const calls = [];
      const assertPortAvailableImpl = async (host, port) => checked.push({ host, port });
      const spawnImpl = (command, args) => {
        calls.push({ command, args });
        const child = new EventEmitter();
        queueMicrotask(() => child.emit("exit", 0, null));
        return child;
      };

      const exitCode = await runAstroTask(task, {
        env: { HOST: "0.0.0.0", PORT: "65000" },
        execPath: WINDOWS_RUNTIME,
        astroEntry: WINDOWS_ASTRO,
        listener: { host: "127.0.0.1", port: 6123 },
        assertPortAvailableImpl,
        spawnImpl,
      });

      expect(exitCode).toBe(0);
      expect(checked).toEqual([{ host: "127.0.0.1", port: "6123" }]);
      expect(calls).toHaveLength(1);
    });
  }

  test("check invokes the Astro JavaScript entrypoint directly", () => {
    const [current] = createAstroInvocations("check", {
      execPath: WINDOWS_RUNTIME,
      astroEntry: WINDOWS_ASTRO,
    });

    expect(current).toEqual({
      command: WINDOWS_RUNTIME,
      args: [WINDOWS_ASTRO, "check"],
    });
  });

  test("child processes cannot reinterpret generic listener variables", async () => {
    const calls = [];
    const spawnImpl = (command, args, options) => {
      calls.push({ command, args, options });
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    };

    const exitCode = await runAstroTask("check", {
      env: {
        CI: "1",
        HOST: "0.0.0.0",
        PORT: "65000",
        EDITOR_PORT: "65001",
        LAZURIO_RUNTIME_PORT: "6123",
      },
      execPath: WINDOWS_RUNTIME,
      astroEntry: WINDOWS_ASTRO,
      spawnImpl,
    });

    expect(exitCode).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].options.env).toEqual({
      CI: "1",
      LAZURIO_RUNTIME_PORT: "6123",
    });
  });

  test("rejects unsupported tasks before spawning a process", () => {
    expect(() => createAstroInvocations("deploy")).toThrow(
      'Neznámý Astro task "deploy"',
    );
  });

  test("build runs check before build and stops on a failed check", async () => {
    const calls = [];
    const spawnImpl = (command, args) => {
      calls.push({ command, args });
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 7, null));
      return child;
    };

    const exitCode = await runAstroTask("build", {
      env: {},
      execPath: WINDOWS_RUNTIME,
      astroEntry: WINDOWS_ASTRO,
      spawnImpl,
    });

    expect(exitCode).toBe(7);
    expect(calls).toEqual([
      {
        command: WINDOWS_RUNTIME,
        args: [WINDOWS_ASTRO, "check"],
      },
    ]);
  });

  test("build runs both portable invocations after a successful check", async () => {
    const calls = [];
    const spawnImpl = (command, args) => {
      calls.push({ command, args });
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    };

    const exitCode = await runAstroTask("build", {
      env: {},
      execPath: WINDOWS_RUNTIME,
      astroEntry: WINDOWS_ASTRO,
      spawnImpl,
    });

    expect(exitCode).toBe(0);
    expect(calls.map(({ args }) => args)).toEqual([
      [WINDOWS_ASTRO, "check"],
      [WINDOWS_ASTRO, "build"],
    ]);
  });
});
