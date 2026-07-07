import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

/**
 * Helpers for the CMS "prose" fields that use Payload's Lexical rich-text editor.
 *
 * `rt()` builds a Lexical editor state from a lightweight markdown string so we
 * can author a field's default wording (with inline emphasis) as plain text
 * instead of hand-writing Lexical JSON. Blank lines separate paragraphs;
 * `**bold**`, `*italic*`, and `__underline__` mark inline formatting. Editors
 * then edit it with the WYSIWYG toolbar in the admin.
 */

// Lexical text-format bitmask.
const BOLD = 1;
const ITALIC = 2;
const UNDERLINE = 8;

function textNode(text: string, format = 0) {
  return { type: "text", detail: 0, format, mode: "normal", style: "", text, version: 1 };
}

// Split one paragraph's text into formatted inline nodes.
function inlineNodes(s: string) {
  const nodes: ReturnType<typeof textNode>[] = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) nodes.push(textNode(s.slice(last, m.index)));
    if (m[1] != null) nodes.push(textNode(m[1], BOLD));
    else if (m[2] != null) nodes.push(textNode(m[2], UNDERLINE));
    else if (m[3] != null) nodes.push(textNode(m[3], ITALIC));
    last = re.lastIndex;
  }
  if (last < s.length) nodes.push(textNode(s.slice(last)));
  if (nodes.length === 0) nodes.push(textNode(""));
  return nodes;
}

function paragraphNode(s: string) {
  return {
    type: "paragraph",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    textFormat: 0,
    textStyle: "",
    children: inlineNodes(s),
  };
}

/** Build a Lexical editor state (richText defaultValue / fallback) from markdown-ish text. */
export function rt(md: string): SerializedEditorState {
  const paras = md
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const children = (paras.length ? paras : [""]).map(paragraphNode);
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children,
    },
  } as unknown as SerializedEditorState;
}

/** True if a richText value actually contains visible text (else treat as empty). */
export function richTextHasText(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const root = (value as { root?: { children?: unknown[] } }).root;
  if (!Array.isArray(root?.children)) return false;
  const walk = (nodes: unknown[]): boolean =>
    nodes.some((n) => {
      const node = n as { text?: string; children?: unknown[] };
      if (typeof node.text === "string" && node.text.trim() !== "") return true;
      if (Array.isArray(node.children)) return walk(node.children);
      return false;
    });
  return walk(root.children);
}

/** True if a value is a richText editor state (vs a plain string field). */
export function isRichText(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    "root" in (value as Record<string, unknown>)
  );
}
