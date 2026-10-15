import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ASTRO_TASKS = Object.freeze(["dev", "preview", "check", "build"]);

export function resolveAstroEntry({
  resolvePackageJson = () => import.meta.resolve("astro/package.json"),
  readPackageJson = (path) => JSON.parse(readFileSync(path, "utf8")),
} = {}) {
  const packageJsonPath = fileURLToPath(resolvePackageJson());
  const packageJson = readPackageJson(packageJsonPath);
  const bin = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin?.astro;
  if (typeof bin !== "string" || !bin.trim()) {
    throw new Error("Balíček astro nemá platný bin.astro entrypoint.");
  }
  return resolve(dirname(packageJsonPath), bin);
}

export const DEFAULT_ASTRO_ENTRY = resolveAstroEntry();

function invocation(execPath, astroEntry, astroArgs) {
  return {
    command: execPath,
    args: [astroEntry, ...astroArgs],
  };
}

export function resolveServerAddress({ listener = {} } = {}) {
  const host = String(listener.host ?? "").trim();
  const port = Number(listener.port);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Astro runtime requires a valid module-owned listener.");
  }
  return { host, port: String(port) };
}

export function assertPortAvailable(
  host,
  port,
  { createServerImpl = createServer } = {},
) {
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65_535) {
    throw new RangeError(`Neplatný port "${port}".`);
  }

  return new Promise((resolve, reject) => {
    const server = createServerImpl();

    server.once("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        reject(new Error(`Port ${numericPort} is already in use on ${host}.`, { cause: error }));
        return;
      }
      reject(
        new Error(`Port ${numericPort} se na ${host} nepodařilo ověřit: ${error.message}`, {
          cause: error,
        }),
      );
    });

    server.listen({ host, port: numericPort, exclusive: true }, () => {
      server.close((error) => {
        if (error) {
          reject(
            new Error(`Kontrolní listener portu ${numericPort} nešel zavřít.`, {
              cause: error,
            }),
          );
          return;
        }
        resolve();
      });
    });
  });
}

export function createAstroInvocations(
  task,
  {
    execPath = process.execPath,
    astroEntry = DEFAULT_ASTRO_ENTRY,
    listener = {},
  } = {},
) {
  if (!ASTRO_TASKS.includes(task)) {
    throw new RangeError(
      `Neznámý Astro task "${task ?? ""}". Použij: ${ASTRO_TASKS.join(", ")}.`,
    );
  }

  if (task === "check") {
    return [invocation(execPath, astroEntry, ["check"])];
  }

  if (task === "build") {
    return [
      invocation(execPath, astroEntry, ["check"]),
      invocation(execPath, astroEntry, ["build"]),
    ];
  }

  const { host, port } = resolveServerAddress({ listener });
  const astroArgs = [task, "--host", host, "--port", port];

  return [invocation(execPath, astroEntry, astroArgs)];
}

function runInvocation({ command, args }, { env, spawnImpl }) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...env };
    delete childEnv.HOST;
    delete childEnv.PORT;
    delete childEnv.EDITOR_PORT;
    const child = spawnImpl(command, args, {
      stdio: "inherit",
      env: childEnv,
    });

    child.once("error", (error) => {
      reject(
        new Error(`Astro runtime se nepodařilo spustit: ${error.message}`, {
          cause: error,
        }),
      );
    });

    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Astro runtime skončil signálem ${signal}.`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

export async function runAstroTask(
  task,
  {
    env = process.env,
    execPath = process.execPath,
    astroEntry = DEFAULT_ASTRO_ENTRY,
    listener = {},
    assertPortAvailableImpl = assertPortAvailable,
    spawnImpl = spawn,
  } = {},
) {
  if (task === "dev" || task === "preview") {
    const { host, port } = resolveServerAddress({ listener });
    await assertPortAvailableImpl(host, port);
  }

  const invocations = createAstroInvocations(task, {
    execPath,
    astroEntry,
    listener,
  });

  for (const current of invocations) {
    const exitCode = await runInvocation(current, { env, spawnImpl });
    if (exitCode !== 0) return exitCode;
  }

  return 0;
}
