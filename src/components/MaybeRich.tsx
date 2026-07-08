"use client";

import Prose from "@/components/Prose";
import { isRichText } from "@/lib/richText";

/**
 * Renders a value that may be either a CMS rich-text (Lexical) object or a plain
 * string. Lets a component accept a prose prop that is rich text (formatted via
 * the WYSIWYG editor) or a legacy string, without changing its call sites.
 * `className` carries the surrounding text styling (add `[&_p]:m-0` for rich text
 * so the inner paragraph slots in).
 */
export default function MaybeRich({
  value,
  className,
}: {
  value: unknown;
  className?: string;
}) {
  if (isRichText(value)) return <Prose className={className} data={value} />;
  if (value == null || value === "") return null;
  return <div className={className}>{String(value)}</div>;
}
