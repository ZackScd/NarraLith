/** Whether the trimmed name has an explicit file extension (FIX-008 D7). */
import { displayName } from "@/lib/pathUtils";

export function hasFileExtension(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) {
    return false;
  }
  if (lastDot === trimmed.length - 1) {
    return false;
  }
  return true;
}

/** Resolve disk filename for create: append `.md` when no extension. Empty → null. */
export function resolveNewFileName(input: string): string | null {
  let trimmed = input.trim();
  while (trimmed.endsWith(".")) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }
  if (trimmed.length === 0) {
    return null;
  }
  if (hasFileExtension(trimmed)) {
    return trimmed;
  }
  return `${trimmed}.md`;
}

export function trimCreateName(input: string): string {
  return input.trim();
}

export function isInlineCreateParent(
  inlineCreate: { parentPath: string } | null,
  parentPath: string,
): boolean {
  return inlineCreate?.parentPath === parentPath;
}

/** Initial input for inline rename: stem visible for `.md` files. */
export function renameInlineInitialName(fileName: string, isDir: boolean): string {
  if (isDir) {
    return fileName;
  }
  if (/\.md$/i.test(fileName)) {
    return displayName(fileName);
  }
  return fileName;
}

/** Resolve disk basename for rename commit. */
export function resolveRenameDiskName(rawInput: string, isDir: boolean): string | null {
  const trimmed = trimCreateName(rawInput);
  if (!trimmed) {
    return null;
  }
  return isDir ? trimmed : resolveNewFileName(trimmed);
}
