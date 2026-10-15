import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

export const onRequest = defineRouteMiddleware((ctx) => {
  const route = ctx.locals.starlightRoute;
  if (!route) return;

  const { pagination, sidebar } = route;
  const overviewLabels = new Map<string, string>();

  function walk(entries: typeof sidebar) {
    for (const entry of entries) {
      if (entry.type === "group") {
        const first = entry.entries[0];
        if (first?.type === "link" && first.label === "Overview") {
          overviewLabels.set(first.href, entry.label);
        }
        walk(entry.entries);
      }
    }
  }

  walk(sidebar);

  if (pagination.prev?.label === "Overview" && pagination.prev.href) {
    const label = overviewLabels.get(pagination.prev.href);
    if (label) pagination.prev.label = label;
  }

  if (pagination.next?.label === "Overview" && pagination.next.href) {
    const label = overviewLabels.get(pagination.next.href);
    if (label) pagination.next.label = label;
  }
});
