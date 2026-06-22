import {
  getHeadShaNative,
  gitBlobAtNative,
  gitFetchAndRebaseNative,
  gitFileLogNative,
  gitFileLogNativeWithStats,
  gitMoveAndCommitNative,
  gitPullNative,
  gitRemoveAndCommitNative,
  gitStageAndCommitNative,
} from "./git-cmd";
import type { CommitEntry } from "@/lib/types";
import type { Config } from "./config";

// Serial queue
// All operations that touch .git/index or the working tree run through this
// queue so concurrent HTTP saves and the background pull loop never race.
let gitTail: Promise<void> = Promise.resolve();
async function withGitLock<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
  const prev = gitTail;
  let fnResult!: Promise<TResult>;
  const mySlot = (async (): Promise<void> => {
    try {
      await prev;
    } catch {
      /* previous error must not block the queue */
    }
    fnResult = fn();
    try {
      await fnResult;
    } catch {
      /* caller receives the error via fnResult */
    }
  })();
  gitTail = mySlot;
  await mySlot;
  return fnResult;
}

async function gitPull(config: Config): Promise<void> {
  return withGitLock(async () => gitPullNative(config));
}

async function gitStageAndCommit(
  config: Config,
  filePaths: string[],
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string; committed?: boolean }> {
  return withGitLock(async () =>
    gitStageAndCommitNative(config, filePaths, message, authorName, authorEmail),
  );
}

async function gitRemoveAndCommit(
  config: Config,
  filePath: string,
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<{ sha: string; error?: string }> {
  return withGitLock(async () =>
    gitRemoveAndCommitNative(config, filePath, message, authorName, authorEmail),
  );
}

async function gitMoveAndCommit(
  config: Config,
  from: string,
  to: string,
  message: string,
  authorName: string,
  authorEmail: string,
  extraMoves?: { from: string; to: string }[],
): Promise<{ sha: string; error?: string }> {
  return withGitLock(async () =>
    gitMoveAndCommitNative(config, from, to, message, authorName, authorEmail, extraMoves),
  );
}

interface FetchResult {
  changed: string[];
  sha: string;
  advanced: boolean;
  pullFailed: boolean;
}

async function gitFetchAndRebase(config: Config): Promise<FetchResult> {
  return withGitLock(async () => gitFetchAndRebaseNative(config));
}

async function getHeadSha(config: Config): Promise<string> {
  return getHeadShaNative(config);
}

/** Return commits that touched `filepath`, most recent first. */
async function gitFileLog(config: Config, filepath: string, limit = 50): Promise<CommitEntry[]> {
  return gitFileLogNative(config, filepath, limit);
}

/** Read the content of `filepath` at a specific full commit SHA. Returns empty string if not found. */
async function gitBlobAt(config: Config, commitSha: string, filepath: string): Promise<string> {
  return gitBlobAtNative(config, commitSha, filepath);
}

/** Return commits enriched with added/removed line counts via `git log --numstat`. */
async function gitFileLogWithStats(
  config: Config,
  filepath: string,
  limit = 50,
): Promise<CommitEntry[]> {
  return gitFileLogNativeWithStats(config, filepath, limit);
}

export {
  gitPull,
  gitStageAndCommit,
  gitRemoveAndCommit,
  gitMoveAndCommit,
  gitFetchAndRebase,
  getHeadSha,
  type CommitEntry,
  type FetchResult,
  gitFileLog,
  gitFileLogWithStats,
  gitBlobAt,
};
