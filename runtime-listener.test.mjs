import { expect, test } from "bun:test";
import {
  editorListener,
  mainListener,
  resolveEditorListener,
  resolveMainListener,
} from "./runtime-listener.mjs";

test("direct starts use the two module-owned leases", () => {
  expect(resolveMainListener({})).toEqual(mainListener);
  expect(resolveEditorListener({})).toEqual(editorListener);
  expect(mainListener.port).toBe(5286);
  expect(editorListener.port).toBe(55286);
});

test("generic listener variables cannot move either listener", () => {
  const polluted = {
    HOST: "0.0.0.0",
    PORT: "65000",
    EDITOR_PORT: "65001",
  };

  expect(resolveMainListener(polluted)).toEqual(mainListener);
  expect(resolveEditorListener(polluted)).toEqual(editorListener);
});

test("matching Lazurio listener injection is accepted", () => {
  expect(
    resolveMainListener({
      LAZURIO_RUNTIME_HOST: mainListener.host,
      LAZURIO_RUNTIME_PORT: String(mainListener.port),
      LAZURIO_RUNTIME_LISTENER_APP_HOST: mainListener.host,
      LAZURIO_RUNTIME_LISTENER_APP_PORT: String(mainListener.port),
    }),
  ).toEqual(mainListener);
  expect(
    resolveEditorListener({
      LAZURIO_RUNTIME_LISTENER_EDITOR_HOST: editorListener.host,
      LAZURIO_RUNTIME_LISTENER_EDITOR_PORT: String(editorListener.port),
    }),
  ).toEqual(editorListener);
});

test("partial or conflicting Lazurio injection fails closed", () => {
  expect(() =>
    resolveMainListener({
      LAZURIO_RUNTIME_HOST: mainListener.host,
    }),
  ).toThrow("must provide both host and port");
  expect(() =>
    resolveMainListener({
      LAZURIO_RUNTIME_LISTENER_APP_HOST: mainListener.host,
      LAZURIO_RUNTIME_LISTENER_APP_PORT: "65000",
    }),
  ).toThrow("does not match");
  expect(() =>
    resolveEditorListener({
      LAZURIO_RUNTIME_LISTENER_EDITOR_HOST: editorListener.host,
      LAZURIO_RUNTIME_LISTENER_EDITOR_PORT: "65001",
    }),
  ).toThrow("does not match");
});
