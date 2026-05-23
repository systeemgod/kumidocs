import { addToCache, deleteFileFromRepo, getAllPaths, getFile } from "./filestore";
import { extname, join, resolve } from "node:path";
import { gitRemoveAndCommit, gitStageAndCommit } from "./git";
import type { Config } from "./config";
import { IMAGE_TYPES } from "@/lib/filetypes";
import type { User } from "@/lib/types";
import isSafePath from "./api-utils";
import { mkdir } from "node:fs/promises";

async function apiUploadImage(req: Request, user: User, config: Config): Promise<Response> {
  if (!user.canEdit) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const MAX = 25 * 1024 * 1024;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX) {
    return Response.json({ error: "File too large (max 25 MB)" }, { status: 413 });
  }

  const ext = extname(file.name).toLowerCase();
  if (!IMAGE_TYPES.has(ext)) {
    return Response.json({ error: "File type not allowed" }, { status: 415 });
  }

  const bytes = await file.arrayBuffer();
  const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  const filename = `${sha256}${ext}`;
  const repoPath = `images/${filename}`;
  const fullPath = join(config.repoPath, repoPath);

  await mkdir(join(config.repoPath, "images"), { recursive: true });
  await Bun.write(fullPath, bytes);
  addToCache(repoPath, "");

  const msg = `docs: upload image ${filename} by ${user.displayName}`;
  await gitStageAndCommit(
    config,
    [repoPath],
    msg,
    user.displayName,
    user.email || "kumidocs@localhost",
  );

  return Response.json({ path: repoPath, url: `/images/${filename}` });
}

// GET /api/images
async function apiImagesList(config: Config): Promise<Response> {
  const all = getAllPaths();
  const imagePaths = all.filter((filePath) => filePath.startsWith("images/"));
  const mdPaths = all.filter((filePath) => filePath.endsWith(".md"));

  const results = await Promise.all(
    imagePaths.map((repoPath) => {
      const filename = repoPath.slice("images/".length);
      // The sha256 portion is the part before the extension
      const dotIdx = filename.lastIndexOf(".");
      const sha256 = dotIdx === -1 ? filename : filename.slice(0, dotIdx);

      let size = 0;
      try {
        size = Bun.file(join(config.repoPath, repoPath)).size;
      } catch {
        // file may be transiently unavailable
      }

      const usedIn = mdPaths.filter((mdPath) => {
        const content = getFile(mdPath) ?? "";
        return content.includes(sha256);
      });

      return { filename, path: repoPath, size, url: `/images/${filename}`, usedIn };
    }),
  );

  return Response.json(results);
}

// DELETE /api/images/:filename
async function apiImageDelete(filename: string, user: User, config: Config): Promise<Response> {
  if (!user.canEdit) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate: only alphanumeric/hyphen SHA256 hex + extension, no path traversal
  if (!/^[0-9a-f]+\.[a-z0-9]+$/u.test(filename)) {
    return Response.json({ error: "Invalid filename" }, { status: 400 });
  }

  const repoPath = `images/${filename}`;
  const dotIdx = filename.lastIndexOf(".");
  const sha256 = dotIdx === -1 ? filename : filename.slice(0, dotIdx);

  const all = getAllPaths();
  if (!all.includes(repoPath)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Block deletion if any .md file references this image by its sha256 hash
  const mdPaths = all.filter((filePath) => filePath.endsWith(".md"));
  const usedIn = mdPaths.filter((mdPath) => {
    const content = getFile(mdPath) ?? "";
    return content.includes(sha256);
  });
  if (usedIn.length > 0) {
    return Response.json({ error: "Image is referenced by pages", usedIn }, { status: 409 });
  }

  await deleteFileFromRepo(repoPath, config);

  const msg = `docs: delete image ${filename} by ${user.displayName}`;
  await gitRemoveAndCommit(
    config,
    repoPath,
    msg,
    user.displayName,
    user.email || "kumidocs@localhost",
  );

  return Response.json({ ok: true });
}

// GET /images/:filename
function serveRepoAsset(assetPath: string, config: Config): Response {
  if (!isSafePath(config.repoPath, assetPath)) {
    return new Response("Forbidden", { status: 403 });
  }

  const fullPath = resolve(config.repoPath, assetPath);
  const MIME: Record<string, string> = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  const ext = extname(assetPath).toLowerCase();
  const mime = MIME[ext] ?? "application/octet-stream";

  try {
    return new Response(Bun.file(fullPath), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": mime,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// GET /api/avatar/:hash — proxies Gravatar so the client never contacts Gravatar directly.
// The hash must be a 64-char lowercase hex string (SHA-256).
async function apiAvatarProxy(hash: string): Promise<Response> {
  if (!/^[0-9a-f]{64}$/u.test(hash)) {
    return new Response("Invalid hash", { status: 400 });
  }
  const upstream = await fetch(`https://gravatar.com/avatar/${hash}?s=80&d=404`);
  if (!upstream.ok) {
    return new Response(undefined, { status: 404 });
  }
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
    },
  });
}

export { apiUploadImage, apiImagesList, apiImageDelete, serveRepoAsset, apiAvatarProxy };
