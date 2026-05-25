import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import ignore from "ignore";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

/** Returns true if the repo-relative path should be excluded from watching/indexing. */
type IgnoreChecker = (relPath: string) => boolean;

function loadGlobalGitignore(): string | undefined {
  // Ask git for the configured global excludes file
  try {
    const result = spawnSync("git", ["config", "--global", "core.excludesFile"], {
      encoding: "utf8",
    });
    if (result.status === 0) {
      const configPath = result.stdout.trim();
      // Expand ~ manually since spawnSync doesn't run through a shell
      const expanded = configPath.startsWith("~/")
        ? join(homedir(), configPath.slice(2))
        : configPath;
      if (expanded && existsSync(expanded)) {
        return readFileSync(expanded, "utf8");
      }
    }
  } catch {
    // git not on PATH or config query failed — fall through to candidates
  }

  // Common fallback locations
  for (const candidate of [
    join(homedir(), ".config/git/ignore"),
    join(homedir(), ".gitignore"),
    join(homedir(), ".gitignore_global"),
  ]) {
    if (existsSync(candidate)) {
      try {
        return readFileSync(candidate, "utf8");
      } catch {
        // unreadable — skip
      }
    }
  }

  return undefined;
}

/**
 * Build an IgnoreChecker from the global gitignore and the repo's .gitignore.
 * The returned function returns true for paths that should be excluded.
 */
function buildIgnoreChecker(repoPath: string): IgnoreChecker {
  const ig = ignore();

  const globalContent = loadGlobalGitignore();
  if (globalContent !== undefined && globalContent !== "") {
    ig.add(globalContent);
  }

  const repoGitignorePath = join(repoPath, ".gitignore");
  if (existsSync(repoGitignorePath)) {
    try {
      ig.add(readFileSync(repoGitignorePath, "utf8"));
    } catch {
      // unreadable
    }
  }

  return (relPath: string): boolean => {
    if (!relPath || relPath === ".") {
      return false;
    }
    try {
      return ig.ignores(relPath.replaceAll("\\", "/"));
    } catch {
      return false;
    }
  };
}

export type { IgnoreChecker };
export { buildIgnoreChecker };
