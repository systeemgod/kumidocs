import { resolve } from "node:path";

/**
 * Returns true if `userPath` resolves to a location inside `repoPath`.
 * Prevents path traversal attacks (e.g. "../../etc/passwd").
 */
function isSafePath(repoPath: string, userPath: string): boolean {
  const safeBase = resolve(repoPath);
  const full = resolve(repoPath, userPath);
  return full === safeBase || full.startsWith(`${safeBase}/`);
}

export default isSafePath;
