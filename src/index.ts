import {
  apiAvatarProxy,
  apiFileCreate,
  apiFileDelete,
  apiFileDiff,
  apiFileGet,
  apiFileHistory,
  apiFilePut,
  apiFileRename,
  apiImageDelete,
  apiImagesList,
  apiMe,
  apiSearch,
  apiSidebar,
  apiTree,
  apiUploadImage,
  serveRepoAsset,
} from "./server/api";
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
import { join, sep } from "node:path";
import { parseUser, setPermissions } from "./server/auth";

import type { KumiDocsPermissions } from "./server/auth";
import type { User } from "./lib/types";
import type { WsData } from "./server/websocket";
// In dev (bun --hot), Bun bundles the frontend on-the-fly with HMR.
// In production (dist/index.js), __BUNDLED__ is injected by scripts/build.ts and
// serveSPA reads from the pre-built dist/public/ directory instead.
import devIndex from "./index.html";
import { loadConfig } from "./server/config";
import { serve } from "bun";

declare const __BUNDLED__: boolean | undefined;
const isBundled = __BUNDLED__ !== undefined;
const publicDir = join(import.meta.dir, "public");
async function serveSPA(req: Request): Promise<Response> {
  const rel = new URL(req.url).pathname.replace(/^\/+/u, "") || "index.html";
  const filePath = join(publicDir, rel);
  // Guard against directory traversal (join resolves ../ segments)
  if (!filePath.startsWith(publicDir + sep)) {
    return new Response(Bun.file(join(publicDir, "index.html")));
  }
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file, {
      headers:
        rel === "index.html" ? {} : { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }
  // SPA fallback — let React Router handle unknown paths
  return new Response(Bun.file(join(publicDir, "index.html")));
}

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
      // Re-read changed files and update the search index incrementally.
      // Use per-file updateInIndex/removeFromIndex (same as API write paths)
      // rather than a full rebuild to avoid redundant work.
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

  routes: {
    "/*": isBundled ? serveSPA : devIndex,

    "/api/avatar/:hash": {
      GET(req: Request) {
        const hash = new URL(req.url).pathname.slice("/api/avatar/".length);
        return apiAvatarProxy(hash);
      },
    },

    "/api/file": {
      DELETE(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFileDelete(new URL(req.url), user, config);
      },
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFileGet(new URL(req.url), config);
      },
      POST(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFileCreate(req, user, config);
      },
      PUT(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFilePut(new URL(req.url), req, user, config);
      },
    },

    "/api/file/diff": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFileDiff(new URL(req.url), config);
      },
    },

    "/api/file/history": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFileHistory(new URL(req.url), config);
      },
    },

    "/api/file/rename": {
      POST(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiFileRename(req, user, config);
      },
    },

    "/api/headers": {
      GET(req: Request) {
        const headers: Record<string, string> = {};
        for (const [key, value] of req.headers) {
          headers[key] = value;
        }
        return Response.json(headers);
      },
    },

    "/api/images": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiImagesList(config);
      },
    },

    "/api/images/:filename": {
      DELETE(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const filename = new URL(req.url).pathname.slice("/api/images/".length);
        return apiImageDelete(decodeURIComponent(filename), user, config);
      },
    },

    "/api/me": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiMe(user, config);
      },
    },

    "/api/search": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiSearch(new URL(req.url));
      },
    },

    "/api/sidebar": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiSidebar();
      },
    },

    "/api/tree": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiTree();
      },
    },

    "/api/upload/image": {
      POST(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return apiUploadImage(req, user, config);
      },
    },

    "/images/:filename": {
      GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const filename = decodeURIComponent(new URL(req.url).pathname.slice("/images/".length));
        return serveRepoAsset(`images/${filename}`, config);
      },
    },
  },

  websocket: {
    open: wsOpen,
    message: wsMessage,
    close: wsClose,
  },
});

console.log(`🚀 KumiDocs (${config.instanceName}) running at ${server.url}`);
console.log(`📁 Repo: ${config.repoPath}`);
