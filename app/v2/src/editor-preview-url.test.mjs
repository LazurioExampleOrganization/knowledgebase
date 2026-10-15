import { describe, expect, test } from "bun:test";
import {
  browserPreviewHost,
  createPreviewBaseUrl,
} from "../../../editor/v2/preview-url.ts";

describe("editor preview URL", () => {
  test.each(["0.0.0.0", "::", "[::]"])(
    "maps wildcard bind host %s to localhost",
    (host) => {
      expect(browserPreviewHost(host)).toBe("localhost");
    },
  );

  test("brackets a concrete IPv6 address", () => {
    expect(createPreviewBaseUrl({ bindHost: "::1", port: 5586 })).toBe(
      "http://[::1]:5586",
    );
  });

  test("allows a separate browser-safe preview host", () => {
    expect(
      createPreviewBaseUrl({
        bindHost: "0.0.0.0",
        previewHost: "knowledgebase.local",
        port: 5586,
      }),
    ).toBe("http://knowledgebase.local:5586");
  });
});
