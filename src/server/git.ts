import { fetchAndRebaseBuiltin, gitPullBuiltin, stageAndCommitBuiltin } from "./git-builtin";
import {
  getHeadShaNative,
  gitBlobAtNative,
  gitFetchAndRebaseNative,
  gitFileLogNative,
  gitMoveAndCommitNative,
  gitPullNative,
  gitRemoveAndCommitNative,
  gitStageAndCommitNative,
} from "./git-cmd";
import type { CommitEntry } from "@/lib/types";
import type { Config } from "./config";
import { promises as fs } from "node:fs";
import git from "isomorphic-git";

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

function gitPull(config: Config): Promise<void> {
  return withGitLock(() =>
    config.gitImpl === "native" ? gitPullNative(config) : gitPullBuiltin(config),
  );
}

function gitStageAndCommit(
  config: Config,
  filePaths: string[],
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string; committed?: boolean }> {
  return withGitLock(() =>
    config.gitImpl === "native"
      ? gitStageAndCommitNative(config, filePaths, message, authorName, authorEmail)
      : stageAndCommitBuiltin(config, filePaths, message, authorName, authorEmail),
  );
}

function gitRemoveAndCommit(
  config: Config,
  filePath: string,
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string }> {
  return withGitLock(() =>
    config.gitImpl === "native"
      ? gitRemoveAndCommitNative(config, filePath, message, authorName, authorEmail)
      : (async (): Promise<{ sha: string; error?: string }> => {
          await git.remove({ dir: config.repoPath, filepath: filePath, fs });
          return stageAndCommitBuiltin(config, [], message, authorName, authorEmail);
        })(),
  );
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
  return withGitLock(() =>
    config.gitImpl === "native"
      ? gitMoveAndCommitNative(config, from, to, message, authorName, authorEmail, extraMoves)
      : (async (): Promise<{ sha: string; error?: string }> => {
          // isomorphic-git has no native move: add the new path, remove the old one.
          await git.add({ dir: config.repoPath, filepath: to, fs });
          await git.remove({ dir: config.repoPath, filepath: from, fs });
          await Promise.all(
            (extraMoves ?? []).map(async (extra) => {
              await git.add({ dir: config.repoPath, filepath: extra.to, fs });
              await git.remove({ dir: config.repoPath, filepath: extra.from, fs });
            }),
          );
          return stageAndCommitBuiltin(config, [], message, authorName, authorEmail);
        })(),
  );
}

function gitFetchAndRebase(
  config: Config,
): Promise<{ changed: string[]; sha: string; advanced: boolean }> {
  return withGitLock(() =>
    config.gitImpl === "native" ? gitFetchAndRebaseNative(config) : fetchAndRebaseBuiltin(config),
  );
}

async function getHeadSha(config: Config): Promise<string> {
  if (config.gitImpl === "native") {
    return getHeadShaNative(config);
  }
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

/** Return commits that touched `filepath`, most recent first. */
async function gitFileLog(config: Config, filepath: string, limit = 50): Promise<CommitEntry[]> {
  if (config.gitImpl === "native") {
    return gitFileLogNative(config, filepath, limit);
  }
  const commits = await git.log({ depth: limit, dir: config.repoPath, filepath, fs });
  return commits.map((commit) => ({
    author: commit.commit.author.name,
    authorEmail: commit.commit.author.email,
    date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
    fullSha: commit.oid,
    message: commit.commit.message.trim(),
    sha: commit.oid.slice(0, 7),
  }));
}

/** Read the content of `filepath` at a specific full commit SHA. Returns empty string if not found. */
async function gitBlobAt(config: Config, commitSha: string, filepath: string): Promise<string> {
  if (config.gitImpl === "native") {
    return gitBlobAtNative(config, commitSha, filepath);
  }
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
