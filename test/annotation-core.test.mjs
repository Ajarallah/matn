import test from "node:test";
import assert from "node:assert/strict";
import AnnotationCore from "../src/annotation-core.cjs";

test("annotation anchors preserve quote, surrounding context, and heading", () => {
  const source = "مقدمة طويلة. النص المهم هنا. خاتمة مفيدة.";
  const start = source.indexOf("النص المهم"), end = start + "النص المهم".length;
  const anchor = AnnotationCore.createAnchor(source, start, end, "الفصل الأول");
  assert.equal(anchor.quote, "النص المهم");
  assert.match(anchor.prefix, /مقدمة/);
  assert.match(anchor.suffix, /هنا/);
  assert.equal(anchor.heading, "الفصل الأول");
});

test("annotations reattach after content is inserted above them", () => {
  const before = "عنوان\nفقرة أولى\nالنص المختار\nفقرة أخيرة";
  const start = before.indexOf("النص المختار");
  const anchor = AnnotationCore.createAnchor(before, start, start + "النص المختار".length, "عنوان");
  const after = "مقدمة جديدة\n" + before;
  const result = AnnotationCore.reattach(after, anchor);
  assert.equal(result.status, "attached");
  assert.equal(after.slice(result.start, result.end), "النص المختار");
});

test("context selects the correct repeated quote and missing quotes become orphaned", () => {
  const source = "قبل أ النص بعد أ ... قبل ب النص بعد ب";
  const start = source.lastIndexOf("النص");
  const anchor = AnnotationCore.createAnchor(source, start, start + 4, "قسم ب");
  assert.equal(AnnotationCore.reattach(source, anchor).start, start);
  assert.equal(AnnotationCore.reattach("محتوى مختلف", anchor).status, "orphan");
});
