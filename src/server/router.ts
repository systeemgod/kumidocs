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
} from "./api";
import { join, sep } from "node:path";
import type { Config } from "./config";
import type { User } from "@/lib/types";
import devIndex from "@/index.html";

// oxlint-disable-next-line no-underscore-dangle
declare const __BUNDLED__: boolean | undefined;
// oxlint-disable-next-line unicorn/no-typeof-undefined
const isBundled = typeof __BUNDLED__ !== "undefined";
const publicDir = join(import.meta.dir, "..", "public");

async function serveSPA(req: Request): Promise<Response> {
  const rel = new URL(req.url).pathname.replace(/^\/+/u, "") || "index.html";
  const filePath = join(publicDir, rel);
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
  return new Response(Bun.file(join(publicDir, "index.html")));
}

type RequireUser = (req: Request) => User | undefined;

function buildRoutes(config: Config, requireUser: RequireUser): Record<string, unknown> {
  return {
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
      async GET(req: Request) {
        const user = requireUser(req);
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const filename = decodeURIComponent(new URL(req.url).pathname.slice("/images/".length));
        return await serveRepoAsset(`images/${filename}`, config);
      },
    },
  };
}

export default buildRoutes;
