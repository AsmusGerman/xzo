function toNode(value: Renderable): Node | null {
  if (value === null || value === undefined || value === false) {
    return null;
  }

  if (value instanceof Node) {
    return value;
  }

  return document.createTextNode(String(value));
}

function collectNodes(value: Renderable): Node[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectNodes(entry));
  }

  const node = toNode(value);
  return node ? [node] : [];
}

export function commitRange(
  start: Comment,
  end: Comment,
  value: Renderable,
): void {
  clearRange(start, end);

  const parent = end.parentNode;
  if (!parent) {
    return;
  }

  const nodes = collectNodes(value);
  for (const node of nodes) {
    parent.insertBefore(node, end);
  }
}

export function clearRange(start: Comment, end: Comment): void {
  let cursor = start.nextSibling;
  while (cursor && cursor !== end) {
    const next = cursor.nextSibling;
    cursor.parentNode?.removeChild(cursor);
    cursor = next;
  }
}
