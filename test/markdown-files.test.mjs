import test from "node:test";
import assert from "node:assert/strict";
import MarkdownFiles from "../src/markdown-files.cjs";

const { MARKDOWN_EXTENSIONS, isMarkdownPath, withoutMarkdownExtension } = MarkdownFiles;

test("recognizes common Markdown and notebook-style extensions", () => {
  for (const extension of MARKDOWN_EXTENSIONS) {
    assert.equal(isMarkdownPath(`وثيقة.${extension}`), true, extension);
    assert.equal(isMarkdownPath(`REPORT.${extension.toUpperCase()}`), true, extension);
  }
  assert.equal(isMarkdownPath("notes.txt"), false);
  assert.equal(isMarkdownPath("archive.md.zip"), false);
});

test("removes only a supported final Markdown extension", () => {
  assert.equal(withoutMarkdownExtension("docs/report.Rmd"), "docs/report");
  assert.equal(withoutMarkdownExtension("notes.txt"), "notes.txt");
});
