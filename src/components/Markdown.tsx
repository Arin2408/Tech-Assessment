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
 *  - We forbid every *resource-loading* tag (img, video, audio, iframe, …) so
 *    untrusted content can make NO network requests at all. This blocks the
 *    obvious script vector AND quieter ones: tracking pixels, SSRF-style
 *    probes, and the junk request the mock's `<img src=x>` would otherwise fire
 *    on every render. A summary is text + code; it has no business loading
 *    remote resources.
 *  - Sanitization runs client-side only; we render nothing on the server pass
 *    (DOMPurify needs a DOM), avoiding any chance of unsanitized SSR output.
 *  - The component is memoized, so a stable summary is not re-sanitized /
 *    re-injected when unrelated live events re-render the surrounding panel.
 */

import { memo, useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

// Tags that can trigger a network fetch or execute code. Untrusted summary
// content is never allowed to use them.
const FORBIDDEN_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "img",
  "image",
  "picture",
  "source",
  "video",
  "audio",
  "track",
  "link",
  "base",
  "form",
];

function sanitize(markdown: string): string {
  // marked.parse is synchronous for string input with async:false (default).
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  if (typeof window === "undefined") {
    // No DOM on the server: never emit unsanitized HTML. Client re-renders.
    return "";
  }
  return DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ["onerror", "onload", "onclick", "srcset"],
    USE_PROFILES: { html: true },
  });
}

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  const html = useMemo(() => sanitize(content), [content]);
  return (
    <div
      className="max-w-none text-sm leading-relaxed text-slate-700 dark:text-slate-300 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400 [&_code]:rounded [&_code]:bg-slate-200/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-slate-800 dark:[&_code]:bg-slate-700/70 dark:[&_code]:text-slate-100 [&_em]:italic [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_li]:my-0.5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 dark:[&_pre]:bg-slate-950 dark:[&_pre]:ring-1 dark:[&_pre]:ring-slate-700 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100 [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
      // eslint-disable-next-line react/no-danger -- content is sanitized above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
