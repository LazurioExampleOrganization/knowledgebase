export function contentOwnsTopAnchor() {
  return (tree) => {
    const heading = findFirstH1(tree);
    if (!heading) return;

    heading.data ??= {};
    heading.data.hProperties = {
      ...heading.data.hProperties,
      id: "_top",
    };
  };
}

function findFirstH1(node) {
  if (node?.type === "heading" && node.depth === 1) return node;

  for (const child of node?.children ?? []) {
    const heading = findFirstH1(child);
    if (heading) return heading;
  }

  return undefined;
}
