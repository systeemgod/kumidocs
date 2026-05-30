/**
 * Isomorphic-git (pure-JS) implementations of each git operation.
 * These are the "builtin" backend — used when config.gitImpl === "builtin".
 */
import git, { TREE } from "isomorphic-git";
import type { Config } from "./config";
import { promises as fs } from "node:fs";
import http from "isomorphic-git/http/node";

async function gitPullBuiltin(config: Config): Promise<void> {
  try {
    await git.pull({
      author: { email: "kumidocs@localhost", name: "KumiDocs" },
      dir: config.repoPath,
      fastForward: true,
      fs,
      http,
      singleBranch: true,
    });
    console.log("Git: pulled from remote");
  } catch (error: unknown) {
    console.warn("Git: pull failed (offline or no remote?) —", String(error));
  }
}

async function pushWithRetry(
  config: Config,
  commitSha: string,
): Promise<{ sha: string; error?: string }> {
  try {
    await git.push({ dir: config.repoPath, fs, http, remote: "origin" });
  } catch (error: unknown) {
    console.warn("Git: push failed, attempting fetch+merge retry —", String(error));
    // Push failed (non-fast-forward) — fetch + merge remote changes, then retry.
    // isomorphic-git does not support rebase, so we merge instead.
    try {
      await git.fetch({
        dir: config.repoPath,
        fs,
        http,
        remote: "origin",
        singleBranch: true,
      });
      await git.merge({
        author: { email: "kumidocs@localhost", name: "KumiDocs" },
        dir: config.repoPath,
        fs,
        ours: "HEAD",
        theirs: "FETCH_HEAD",
      });
      await git.push({ dir: config.repoPath, fs, http, remote: "origin" });
    } catch {
      // The commit is still present locally — the content is safe.
      // 'push_failed' signals a remote-sync problem, not data loss.
      return { error: "push_failed", sha: commitSha.slice(0, 7) };
    }
  }
  return { sha: commitSha.slice(0, 7) };
}

async function stageAndCommitBuiltin(
  config: Config,
  filePaths: string[],
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string; committed?: boolean }> {
  try {
    await Promise.all(
      filePaths.map(async (fp) => git.add({ dir: config.repoPath, filepath: fp, fs })),
    );

    // Scope the status check to the paths we staged so we don't accidentally
    // commit unrelated workdir noise or pick up changes staged concurrently.
    // When filePaths is empty (remove/move callers pre-stage externally) we
    // fall back to the full scan — the lock guarantees exclusivity in that case.
    const statusOpts = filePaths.length > 0 ? { filepaths: filePaths } : {};
    const status = await git.statusMatrix({ dir: config.repoPath, fs, ...statusOpts });
    // stage=1 means index equals HEAD (nothing staged for this file)
    const hasChanges = status.some((row: [string, number, number, number]) => row[3] !== 1);
    if (!hasChanges) {
      const sha = await git.resolveRef({ dir: config.repoPath, fs, ref: "HEAD" });
      return { committed: false, sha: sha.slice(0, 7) };
    }

    const sha = await git.commit({
      author: { email: authorEmail, name: authorName },
      dir: config.repoPath,
      fs,
      message,
    });

    const result = await pushWithRetry(config, sha);
    return { ...result, committed: true };
  } catch (error) {
    try {
      const sha = await git.resolveRef({ dir: config.repoPath, fs, ref: "HEAD" });
      return { error: String(error), sha: sha.slice(0, 7) };
    } catch {
      return { error: String(error), sha: "unknown" };
    }
  }
}

async function fetchAndRebaseBuiltin(
  config: Config,
): Promise<{ changed: string[]; sha: string; advanced: boolean; pullFailed: boolean }> {
  const before = await git.resolveRef({ dir: config.repoPath, fs, ref: "HEAD" }).catch(() => "");
  let pullFailed = false;

  try {
    await git.fetch({ dir: config.repoPath, fs, http, remote: "origin", singleBranch: true });
    await git.merge({
      author: { email: "kumidocs@localhost", name: "KumiDocs" },
      dir: config.repoPath,
      fs,
      ours: "HEAD",
      theirs: "FETCH_HEAD",
    });
  } catch (error: unknown) {
    console.warn("Git: fetch/merge failed (offline or conflict?) —", String(error));
    pullFailed = true;
  }

  const after = await git.resolveRef({ dir: config.repoPath, fs, ref: "HEAD" }).catch(() => "");
  const advanced = before !== after && before !== "";
  const sha = after.slice(0, 7);

  const changed: string[] = [];
  if (advanced) {
    try {
      await git.walk({
        dir: config.repoPath,
        fs,
        map: async (filepath, [entryA, entryB]) => {
          if ((await entryA?.type()) === "tree" || (await entryB?.type()) === "tree") {
            return;
          }
          const aOid = await entryA?.oid();
          const bOid = await entryB?.oid();
          if (aOid !== bOid) {
            changed.push(filepath);
          }
        },
        trees: [TREE({ ref: before }), TREE({ ref: after })],
      });
    } catch (error: unknown) {
      console.warn("Failed to enumerate changed files after pull:", error);
    }
  }

  return { advanced, changed, pullFailed, sha };
}

export { fetchAndRebaseBuiltin, gitPullBuiltin, stageAndCommitBuiltin };
