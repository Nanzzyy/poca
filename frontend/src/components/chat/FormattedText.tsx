"use client";

import { type ReactNode } from "react";

// Minimal inline-markdown renderer: **bold**, *italic*. Avoids adding a
// markdown dependency just to stop the LLM's "**...**" from showing literally.
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={key++} className="font-semibold">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(<em key={key++}>{m[3]}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function FormattedText({ text }: { text: string }) {
  const lines = (text || "").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*([-•]|\d+\.)\s+/.test(line);
        return (
          <div key={i} className={bullet ? "pl-2" : undefined}>
            {renderInline(line) || " "}
          </div>
        );
      })}
    </>
  );
}
