import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

// The page's JavaScript lives inline in index.html, out of reach of `node --check`. A syntax
// error there blanks the whole reader, so parse every inline script of both builds.
for (const file of ["../src/index.html", "../docs/index.html"]) {
  test(`every inline script in ${file.slice(3)} parses`, () => {
    const html = readFileSync(new URL(file, import.meta.url), "utf8");
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(([, attrs]) => !/type="(?!text\/javascript|module)/.test(attrs));
    assert.ok(scripts.length > 0);
    for (const [, , body] of scripts) assert.doesNotThrow(() => new Script(body), body.slice(0, 80));
  });
}
