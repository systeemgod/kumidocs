import {
  broadcastPageChanged,
  broadcastPageDeleted,
  pruneDeadSessions,
  wsClose,
  wsMessage,
  wsOpen,
} from "./server/websocket";
import { consumeWritten, loadFilestore, reloadFile, removeFromCache } from "./server/filestore";
import { existsSync, watch } from "node:fs";
import { gitFetchAndRebase, gitPull, gitStageAndCommit } from "./server/git";
import { initSearch, removeFromIndex, updateInIndex } from "./server/search";
import { parseUser, setPermissions } from "./server/auth";
import type { KumiDocsPermissions } from "./server/auth";
import type { User } from "./lib/types";
import type { WsData } from "./server/websocket";
import buildRoutes from "./server/router";
import { join } from "node:path";
import { loadConfig } from "./server/config";
import { serve } from "bun";

const config = loadConfig();

// Validate repo
if (!existsSync(join(config.repoPath, ".git"))) {
  throw new Error(`Fatal: ${config.repoPath} is not a git repository.`);
}

// Load .kumidocs.json permissions
async function loadPermissions(): Promise<void> {
  const configPath = join(config.repoPath, ".kumidocs.json");
  try {
    const raw = await Bun.file(configPath).text();
    setPermissions(JSON.parse(raw) as KumiDocsPermissions);
  } catch (error: unknown) {
    // If file doesn't exist, create it with default config
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      const defaultConfig = {
        editors: [],
        instanceName: config.instanceName,
      };
      await Bun.write(configPath, JSON.stringify(defaultConfig, undefined, 2));
      setPermissions(defaultConfig);
      console.log("Created .kumidocs.json with default configuration");

      // Commit and push the new config file
      await gitStageAndCommit(
        config,
        [".kumidocs.json"],
        "chore: initialize .kumidocs.json",
        "KumiDocs",
        "kumidocs@localhost",
      );
      console.log("Committed and pushed .kumidocs.json to repository");
    } else {
      setPermissions({});
    }
  }
}

await loadPermissions();

// Watch entire repo folder for on-disk changes and reload immediately
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
watch(config.repoPath, { recursive: true }, (_event, filename) => {
  if (!filename) {
    return;
  }
  const relPath = filename.replaceAll("\\", "/");
  if (relPath.startsWith(".git/") || relPath === ".git") {
    return;
  }
  const prev = debounceMap.get(relPath);
  if (prev) {
    clearTimeout(prev);
  }
  debounceMap.set(
    relPath,
    setTimeout(async () => {
      debounceMap.delete(relPath);
      if (relPath === ".kumidocs.json") {
        await loadPermissions();
        console.log("Reloaded .kumidocs.json");
        return;
      }
      const fullPath = join(config.repoPath, relPath);
      if (existsSync(fullPath)) {
        await reloadFile(relPath, config);
        updateInIndex(relPath);
        // Skip broadcast for writes originated by this server process
        if (!consumeWritten(relPath)) {
          broadcastPageChanged(relPath, "", "disk", "Local");
        }
      } else {
        removeFromCache(relPath);
        removeFromIndex(relPath);
        broadcastPageDeleted(relPath);
      }
    }, 100),
  );
});

await gitPull(config);
await loadFilestore(config);
initSearch();

// Auth helper used in route handlers
function requireUser(req: Request): User | undefined {
  return parseUser(req.headers, config.authHeader);
}

// Background tasks
setInterval(() => {
  void (async (): Promise<void> => {
    const result = await gitFetchAndRebase(config);
    if (result.advanced) {
      await loadPermissions();
      await Promise.all(
        result.changed
          .filter((changedPath) => changedPath !== ".kumidocs.json")
          .map(async (changedPath) => {
            const fullPath = join(config.repoPath, changedPath);
            if (existsSync(fullPath)) {
              await reloadFile(changedPath, config);
              updateInIndex(changedPath);
              broadcastPageChanged(changedPath, result.sha, "upstream", "Remote");
            } else {
              removeFromCache(changedPath);
              removeFromIndex(changedPath);
              broadcastPageDeleted(changedPath);
            }
          }),
      );
    }
  })();
}, config.pullInterval);

// Prune dead WS sessions every 30s
setInterval(pruneDeadSessions, 30_000);

const server = serve<WsData>({
  // oxlint-disable-next-line node/no-process-env
  development: process.env.NODE_ENV !== "production" && {
    console: true,
    hmr: true,
  },

  fetch(req, srv) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const user = requireUser(req);
      if (!user) {
        return new Response("Unauthorized", { status: 401 });
      }
      const upgraded = srv.upgrade(req, {
        data: {
          lastHeartbeat: Date.now(),
          pageId: undefined,
          sessionId: "",
          user,
        },
      });
      return upgraded ? undefined : new Response("WS upgrade failed", { status: 400 });
    }
  },

  port: config.port,

  routes: buildRoutes(config, requireUser),

  websocket: {
    close: wsClose,
    message: wsMessage,
    open: wsOpen,
  },
});

console.log(`🚀 KumiDocs (${config.instanceName}) running at ${server.url}`);
console.log(`📁 Repo: ${config.repoPath}`);
