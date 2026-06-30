import { render } from "@testing-library/react";
import { Markdown } from "./Markdown";

describe("Markdown (sanitization boundary)", () => {
  it("renders markdown structure (headings, code, emphasis)", () => {
    const { container } = render(
      <Markdown content={"## Title\n\nSome **bold** and `code`.\n\n```ts\nconst x = 1;\n```"} />,
    );
    expect(container.querySelector("h2")?.textContent).toContain("Title");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("pre")).toBeTruthy();
  });

  it("strips <script> tags from untrusted content", () => {
    const { container } = render(
      <Markdown content={"Safe text\n\n<script>alert('xss-script')</script>\n\nDone."} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("alert('xss-script')");
  });

  it("strips event-handler attributes like onerror from <img>", () => {
    const { container } = render(
      <Markdown content={`<img src=x onerror="alert('xss-img')">`} />,
    );
    const img = container.querySelector("img");
    // The img may survive but its onerror handler must not.
    if (img) expect(img.getAttribute("onerror")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
  });
});
