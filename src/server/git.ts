import git, { TREE } from "isomorphic-git";
import type { Config } from "./config";
import { promises as fs } from "node:fs";
import http from "isomorphic-git/http/node";

// ── Serial queue ──────────────────────────────────────────────────────────────
// All operations that touch the .git/index or working tree run through this
// queue so concurrent HTTP saves and the background pull loop never race.
let gitTail: Promise<void> = Promise.resolve();
async function withGitLock<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
  const prev = gitTail;
  let fnResult!: Promise<TResult>;
  // Advance the tail synchronously so concurrent callers queue up behind this op.
  const mySlot = (async (): Promise<void> => {
    // Swallow errors from previous op so one failure doesn't stall the queue.
    try {
      await prev;
    } catch {
      /* intentionally empty — previous op errors must not block the queue */
    }
    fnResult = fn();
    // Swallow fn's error on the tail so the queue keeps running after failures.
    try {
      await fnResult;
    } catch {
      /* intentionally empty — caller receives the error via fnResult */
    }
  })();
  gitTail = mySlot;
  await mySlot;
  return fnResult;
}

async function _gitPull(config: Config): Promise<void> {
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
  } catch {
    // Offline or no remote configured — not fatal
  }
}

function gitPull(config: Config): Promise<void> {
  return withGitLock(() => _gitPull(config));
}

async function pushWithRetry(
  config: Config,
  commitSha: string,
): Promise<{ sha: string; error?: string }> {
  try {
    await git.push({ dir: config.repoPath, fs, http, remote: "origin" });
  } catch {
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

async function _stageAndCommit(
  config: Config,
  filePaths: string[],
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string; committed?: boolean }> {
  try {
    await Promise.all(filePaths.map((fp) => git.add({ dir: config.repoPath, filepath: fp, fs })));

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

function gitStageAndCommit(
  config: Config,
  filePaths: string[],
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string; committed?: boolean }> {
  return withGitLock(() => _stageAndCommit(config, filePaths, message, authorName, authorEmail));
}

function gitRemoveAndCommit(
  config: Config,
  filePath: string,
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string }> {
  return withGitLock(async () => {
    await git.remove({ dir: config.repoPath, filepath: filePath, fs });
    return _stageAndCommit(config, [], message, authorName, authorEmail);
  });
}

function gitMoveAndCommit(
  config: Config,
  from: string,
  to: string,
  message: string,
  authorName: string,
  authorEmail: string,
  extraMoves?: { from: string; to: string }[],
): Promise<{ sha: string; error?: string }> {
  return withGitLock(async () => {
    // isomorphic-git has no native move: add the new path, remove the old one.
    await git.add({ dir: config.repoPath, filepath: to, fs });
    await git.remove({ dir: config.repoPath, filepath: from, fs });
    await Promise.all(
      (extraMoves ?? []).map(async (extra) => {
        await git.add({ dir: config.repoPath, filepath: extra.to, fs });
        await git.remove({ dir: config.repoPath, filepath: extra.from, fs });
      }),
    );
    return _stageAndCommit(config, [], message, authorName, authorEmail);
  });
}

async function _fetchAndRebase(
  config: Config,
): Promise<{ changed: string[]; sha: string; advanced: boolean }> {
  const before = await git.resolveRef({ dir: config.repoPath, fs, ref: "HEAD" }).catch(() => "");

  try {
    await git.fetch({ dir: config.repoPath, fs, http, remote: "origin", singleBranch: true });
    await git.merge({
      author: { email: "kumidocs@localhost", name: "KumiDocs" },
      dir: config.repoPath,
      fs,
      ours: "HEAD",
      theirs: "FETCH_HEAD",
    });
  } catch {
    // No remote, offline, or merge conflict — skip this cycle
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

  return { advanced, changed, sha };
}

function gitFetchAndRebase(
  config: Config,
): Promise<{ changed: string[]; sha: string; advanced: boolean }> {
  return withGitLock(() => _fetchAndRebase(config));
}

async function getHeadSha(config: Config): Promise<string> {
  try {
    const sha = await git.resolveRef({
      dir: config.repoPath,
      fs,
      ref: "HEAD",
    });
    return sha.slice(0, 7);
  } catch {
    return "unknown";
  }
}

interface CommitEntry {
  sha: string; // short (7-char)
  fullSha: string;
  message: string;
  author: string;
  date: string;
}

/** Return commits that touched `filepath`, most recent first. */
async function gitFileLog(config: Config, filepath: string, limit = 50): Promise<CommitEntry[]> {
  const commits = await git.log({ depth: limit, dir: config.repoPath, filepath, fs });
  return commits.map((commit) => ({
    author: commit.commit.author.name,
    date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
    fullSha: commit.oid,
    message: commit.commit.message.trim(),
    sha: commit.oid.slice(0, 7),
  }));
}

/** Read the content of `filepath` at a specific full commit SHA. Returns empty string if not found. */
async function gitBlobAt(config: Config, commitSha: string, filepath: string): Promise<string> {
  try {
    const { blob } = await git.readBlob({
      dir: config.repoPath,
      filepath,
      fs,
      oid: commitSha,
    });
    return new TextDecoder().decode(blob);
  } catch {
    return "";
  }
}

export {
  gitPull,
  gitStageAndCommit,
  gitRemoveAndCommit,
  gitMoveAndCommit,
  gitFetchAndRebase,
  getHeadSha,
  type CommitEntry,
  gitFileLog,
  gitBlobAt,
};
