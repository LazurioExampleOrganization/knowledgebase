import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { sidebar } from "../../../data/v2/sidebar";

// The content contract of the knowledgebase: data/v2/docs is the only page
// corpus, every page declares its title in frontmatter, and every sidebar entry
// points at a page of the default locale (Starlight falls back to it when a
// translation is missing).
const docs = resolve(import.meta.dir, "../../../data/v2/docs");
const DEFAULT_LOCALE_DIRECTORY = "cs";

type SidebarEntry = { slug?: string; items?: SidebarEntry[] };

function pages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pages(path);
    return /\.mdx?$/.test(entry.name) ? [path] : [];
  });
}

function slugs(entries: readonly SidebarEntry[]): string[] {
  return entries.flatMap((entry) => [
    ...(entry.slug ? [entry.slug] : []),
    ...slugs(entry.items ?? []),
  ]);
}

describe("knowledgebase content", () => {
  test("has pages in the default locale", () => {
    expect(pages(join(docs, DEFAULT_LOCALE_DIRECTORY)).length).toBeGreaterThan(0);
  });

  test("every page declares a title in frontmatter", () => {
    for (const page of pages(docs)) {
      const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(page, "utf8"))?.[1] ?? "";
      const path = relative(docs, page);
      expect({ path, title: /^title: \S/m.test(frontmatter) }).toEqual({ path, title: true });
    }
  });

  test("every sidebar slug resolves to a page of the default locale", () => {
    for (const slug of slugs(sidebar as readonly SidebarEntry[])) {
      const base = join(docs, DEFAULT_LOCALE_DIRECTORY, slug);
      const candidates = [
        `${base}.md`,
        `${base}.mdx`,
        join(base, "index.md"),
        join(base, "index.mdx"),
      ];
      const found = candidates.some((candidate) => existsSync(candidate));
      expect({ slug, found }).toEqual({ slug, found: true });
    }
  });
});
