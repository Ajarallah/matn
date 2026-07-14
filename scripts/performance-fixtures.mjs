import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const LARGE_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const LARGE_WORKSPACE_FILES = 2000;

function largeDocument(bytes = LARGE_DOCUMENT_BYTES) {
  const line = "هذه فقرة عربية طويلة لاختبار القراءة ثنائية الاتجاه مع API و const value = 42 ورابط محلي. ";
  const chunks = ["# مستند الأداء المرجعي\n\n"];
  let size = Buffer.byteLength(chunks[0]);
  let nextHeading = 1024 * 1024;
  while (size < bytes) {
    if (size >= nextHeading) {
      const heading = `\n\n## قسم عند ${Math.round(size / 1024 / 1024)}MB\n\n`;
      chunks.push(heading);
      size += Buffer.byteLength(heading);
      nextHeading += 1024 * 1024;
    }
    chunks.push(line);
    size += Buffer.byteLength(line);
  }
  return chunks.join("");
}

export async function generatePerformanceWorkspace(root, options = {}) {
  const fileCount = Number(options.fileCount) || LARGE_WORKSPACE_FILES;
  const documentBytes = Number(options.documentBytes) || LARGE_DOCUMENT_BYTES;
  await mkdir(join(root, "notes"), { recursive: true });
  await writeFile(join(root, "large.md"), largeDocument(documentBytes), "utf8");
  await writeFile(join(root, "guide.md"), "# الدليل\n\nمرجع محلي.\n", "utf8");
  const writes = [];
  for (let index = 0; index < fileCount; index++) {
    const id = String(index).padStart(4, "0");
    writes.push(writeFile(
      join(root, "notes", `note-${id}.md`),
      `# ملاحظة ${id}\n\nمحتوى عربي قابل للبحث ورمز فريد-${id}.\n`,
      "utf8",
    ));
    if (writes.length === 100) await Promise.all(writes.splice(0));
  }
  await Promise.all(writes);
  return { root, largeFile: join(root, "large.md"), fileCount: fileCount + 2, documentBytes };
}
