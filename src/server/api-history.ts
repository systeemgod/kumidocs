import { gitBlobAt, gitFileLog } from "./git";
import type { Config } from "./config";
import { createTwoFilesPatch } from "diff";
import isSafePath from "./api-utils";

// GET /api/file/history?path=<path>
async function apiFileHistory(url: URL, config: Config): Promise<Response> {
  const path = decodeURIComponent(url.searchParams.get("path") ?? "");
  if (!path) {
    return Response.json({ error: "path required" }, { status: 400 });
  }
  if (!isSafePath(config.repoPath, path)) {
    return new Response("Forbidden", { status: 403 });
  }
  const commits = await gitFileLog(config, path);
  const enriched = await Promise.all(
    commits.map(async (commit, idx) => {
      const parentCommit = commits[idx + 1];
      const [after, before] = await Promise.all([
        gitBlobAt(config, commit.fullSha, path),
        parentCommit ? gitBlobAt(config, parentCommit.fullSha, path) : Promise.resolve(""),
      ]);
      const patch = createTwoFilesPatch("", "", before, after, "", "", { context: 0 });
      let added = 0;
      let removed = 0;
      for (const line of patch.split("\n")) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          added++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          removed++;
        }
      }
      return {
        added,
        author: commit.author,
        authorEmail: commit.authorEmail,
        date: commit.date,
        fullSha: commit.fullSha,
        message: commit.message,
        removed,
        sha: commit.sha,
      };
    }),
  );
  return Response.json(enriched);
}

// GET /api/file/diff?path=<path>&sha=<sha>
async function apiFileDiff(url: URL, config: Config): Promise<Response> {
  const path = decodeURIComponent(url.searchParams.get("path") ?? "");
  const shortSha = url.searchParams.get("sha") ?? "";
  if (!path || !shortSha) {
    return Response.json({ error: "path and sha required" }, { status: 400 });
  }
  if (!isSafePath(config.repoPath, path)) {
    return new Response("Forbidden", { status: 403 });
  }

  const commits = await gitFileLog(config, path, 500);
  const idx = commits.findIndex(
    (commit) => commit.fullSha.startsWith(shortSha) || commit.sha === shortSha,
  );
  if (idx === -1) {
    return Response.json({ error: "Commit not found in file history" }, { status: 404 });
  }

  const commit = commits[idx];
  if (!commit) {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
  const parentCommit = commits[idx + 1];

  const after = await gitBlobAt(config, commit.fullSha, path);
  const before = parentCommit ? await gitBlobAt(config, parentCommit.fullSha, path) : "";

  // Generate unified diff string in git format for react-diff-view's parseDiff
  const rawPatch = createTwoFilesPatch(`a/${path}`, `b/${path}`, before, after, "", "", {
    context: 4,
  });
  // createTwoFilesPatch emits "Index: ...\n===...\n--- ...\n+++ ...\n@@ ..." which confuses
  // parseDiff's path extractor. Re-assemble as a proper "diff --git" block instead.
  const hunkStart = rawPatch.indexOf("\n@@");
  const unifiedDiff =
    hunkStart === -1
      ? ""
      : `diff --git a/${path} b/${path}\nindex 0000000..0000000 100644\n--- a/${path}\n+++ b/${path}\n${rawPatch.slice(hunkStart + 1)}`;

  return Response.json({
    author: commit.author,
    date: commit.date,
    message: commit.message,
    sha: commit.sha,
    unifiedDiff,
  });
}

export { apiFileHistory, apiFileDiff };
