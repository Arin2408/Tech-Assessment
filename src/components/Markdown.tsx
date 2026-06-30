"use client";

/**
 * Markdown.tsx — the SINGLE place untrusted summary content becomes DOM.
 *
 * Pipeline: raw markdown --marked--> HTML string --DOMPurify--> safe HTML.
 * Only the sanitized string is ever handed to dangerouslySetInnerHTML.
 *
 * Why this is safe:
 *  - DOMPurify removes `<script>` and other executable nodes, and strips all
 *    `on*` event-handler attributes (so `<img onerror=...>` loses its handler).
 *  - We additionally forbid the `<script>` tag and `onerror` attr explicitly as
 *    defense-in-depth, and run with the default (HTML, not SVG/MathML) profile.
 *  - Sanitization runs client-side only; we render nothing on the server pass
 *    (DOMPurify needs a DOM), avoiding any chance of unsanitized SSR output.
 */

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

function sanitize(markdown: string): string {
  // marked.parse is synchronous for string input with async:false (default).
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  if (typeof window === "undefined") {
    // No DOM on the server: never emit unsanitized HTML. Client re-renders.
    return "";
  }
  return DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
    USE_PROFILES: { html: true },
  });
}

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => sanitize(content), [content]);
  return (
    <div
      className="max-w-none text-sm leading-relaxed text-slate-700 [&_a]:text-indigo-600 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-200/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-slate-800 [&_em]:italic [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:my-0.5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
      // eslint-disable-next-line react/no-danger -- content is sanitized above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
