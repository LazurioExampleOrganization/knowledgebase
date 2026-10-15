import { describe, expect, test } from "bun:test";
import { contentOwnsTopAnchor } from "./content-owns-top-anchor.mjs";

describe("content-owned Starlight top anchor", () => {
  test("assigns _top to the first authored H1 and preserves its properties", () => {
    const h2 = { type: "heading", depth: 2, children: [] };
    const h1 = {
      type: "heading",
      depth: 1,
      data: { hProperties: { className: ["custom"] } },
      children: [],
    };
    const tree = { type: "root", children: [h2, { type: "section", children: [h1] }] };

    contentOwnsTopAnchor()(tree);

    expect(h1.data.hProperties).toEqual({ className: ["custom"], id: "_top" });
    expect(h2.data).toBeUndefined();
  });

  test("leaves a document without an H1 unchanged", () => {
    const tree = {
      type: "root",
      children: [{ type: "heading", depth: 2, children: [] }],
    };

    contentOwnsTopAnchor()(tree);

    expect(tree.children[0].data).toBeUndefined();
  });
});
