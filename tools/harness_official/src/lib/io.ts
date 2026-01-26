import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function mustReadUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`GATE FAIL: File not found: ${path}`);
  }
  return readFileSync(path, "utf8");
}

export function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function writeUtf8(path: string, content: string): void {
  ensureDir(path);
  writeFileSync(path, content, "utf8");
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}
