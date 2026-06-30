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

  it("removes untrusted <img> entirely so it makes no network request", () => {
    const { container } = render(
      <Markdown content={`<img src=x onerror="alert('xss-img')">`} />,
    );
    // The whole resource-loading tag is dropped — no img, no onerror, no src=x
    // request fired on render.
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("src=");
  });

  it("strips other resource-loading tags (iframe, video) from untrusted content", () => {
    const { container } = render(
      <Markdown content={`<iframe src="evil"></iframe>\n\n<video src="evil"></video>`} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });
});
