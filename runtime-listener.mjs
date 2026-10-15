import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("./lazurio.module.json", import.meta.url), "utf8"),
);

if (manifest.schema_version !== "lazurio.module.v1") {
  throw new Error("lazurio.module.json must use schema lazurio.module.v1.");
}

function readLease(id) {
  const candidate = manifest.port_leases?.find((lease) => lease.id === id);
  if (
    !candidate ||
    typeof candidate.host !== "string" ||
    !candidate.host.trim() ||
    !Number.isInteger(candidate.port) ||
    candidate.port < 1024 ||
    candidate.port > 65_535
  ) {
    throw new Error(
      `lazurio.module.json must declare a valid ${id} listener lease.`,
    );
  }

  return Object.freeze({
    host: candidate.host,
    port: candidate.port,
  });
}

export const mainListener = readLease("main");
export const editorListener = readLease("editor");

function validatePair(listener, host, rawPort, source) {
  if (host === undefined && rawPort === undefined) return;
  if (!host || !rawPort) {
    throw new Error(`${source} must provide both host and port.`);
  }
  if (host !== listener.host || Number(rawPort) !== listener.port) {
    throw new Error(
      `${source} listener ${host}:${rawPort} does not match the module-owned lease ${listener.host}:${listener.port}.`,
    );
  }
}

export function resolveMainListener(env = process.env) {
  validatePair(
    mainListener,
    env.LAZURIO_RUNTIME_HOST,
    env.LAZURIO_RUNTIME_PORT,
    "Lazurio runtime",
  );
  validatePair(
    mainListener,
    env.LAZURIO_RUNTIME_LISTENER_APP_HOST,
    env.LAZURIO_RUNTIME_LISTENER_APP_PORT,
    "Lazurio app listener",
  );
  return mainListener;
}

export function resolveEditorListener(env = process.env) {
  validatePair(
    editorListener,
    env.LAZURIO_RUNTIME_LISTENER_EDITOR_HOST,
    env.LAZURIO_RUNTIME_LISTENER_EDITOR_PORT,
    "Lazurio editor listener",
  );
  return editorListener;
}
