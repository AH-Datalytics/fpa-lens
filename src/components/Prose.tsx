"use client";

import { RichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

/**
 * Renders a CMS rich-text (Lexical) field. The wrapper carries the surrounding
 * text styling (color/size/spacing); use Tailwind child variants like
 * `[&_p]:m-0` on `className` to control the inner paragraph spacing so it slots
 * into the existing layout. Bold/italic/underline render as <strong>/<em>/<u>.
 */
export default function Prose({
  data,
  className,
}: {
  data: unknown;
  className?: string;
}) {
  return (
    <div className={className}>
      <RichText data={data as SerializedEditorState} />
    </div>
  );
}
