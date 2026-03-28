import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "dictionary-tr");
const destDir = join(root, "public", "dicts", "tr");

await mkdir(destDir, { recursive: true });
await copyFile(join(srcDir, "index.aff"), join(destDir, "index.aff"));
await copyFile(join(srcDir, "index.dic"), join(destDir, "index.dic"));
