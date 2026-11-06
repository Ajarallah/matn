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

test("files in older Arabic encodings read as Arabic, not garbage", async () => {
  const { decodeText } = (await import("../src/markdown-files.cjs")).default;
  const arabic = "# العربية\nنص";
  assert.equal(decodeText(Buffer.from(arabic, "utf8")), arabic);
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(arabic, "utf8")])), arabic, "UTF-8 with a BOM");
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(arabic, "utf16le")])), arabic, "UTF-16 from Windows Notepad");
  const be = Buffer.from(arabic, "utf16le"); for (let i = 0; i < be.length; i += 2) [be[i], be[i + 1]] = [be[i + 1], be[i]];
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xfe, 0xff]), be])), arabic, "UTF-16 big-endian");
  // "العربية" in Windows-1256, as old Arabic Windows tools saved it
  assert.equal(decodeText(Buffer.from([0x23, 0x20, 0xc7, 0xe1, 0xda, 0xd1, 0xc8, 0xed, 0xc9])), "# العربية");
});
