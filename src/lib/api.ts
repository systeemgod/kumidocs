import type { CommitEntry, SearchResult, TreeNode } from "./types";
import type { SlideThemeMap } from "./slide";

// ── Error ─────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  public constructor(status: number, body?: unknown) {
    super(`API error ${status.toString()}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ── Response types ────────────────────────────────────────────────────────────

interface MeResponse {
  id: string;
  email: string;
  name: string;
  displayName: string;
  canEdit: boolean;
  instanceName?: string;
  autoSaveDelay?: number;
  slideThemes?: SlideThemeMap;
}

interface FileGetResponse {
  content: string;
  path: string;
  sha: string;
}

interface FileSaveResponse {
  sha: string;
  pushWarning?: boolean;
}

interface ImageEntry {
  filename: string;
  path: string;
  url: string;
  size: number;
  usedIn: string[];
}

interface DiffData {
  sha: string;
  message: string;
  author: string;
  date: string;
  unifiedDiff: string;
}

// ── Core request helper ───────────────────────────────────────────────────────

async function request<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // body may not be JSON — ignore parse error
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<TResponse>;
}

// ── API functions ─────────────────────────────────────────────────────────────

const getMe = (): Promise<MeResponse> => request<MeResponse>("/api/me");

const getTree = (): Promise<TreeNode[]> => request<TreeNode[]>("/api/tree");

const searchPages = (query: string): Promise<SearchResult[]> =>
  request<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`);

const getFile = (path: string): Promise<FileGetResponse> =>
  request<FileGetResponse>(`/api/file?path=${encodeURIComponent(path)}`);

const putFile = (path: string, content: string): Promise<FileSaveResponse> =>
  request<FileSaveResponse>(`/api/file?path=${encodeURIComponent(path)}`, {
    body: JSON.stringify({ content }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });

const createFile = (path: string, content: string): Promise<FileSaveResponse> =>
  request<FileSaveResponse>("/api/file", {
    body: JSON.stringify({ content, path }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

const deleteFile = async (path: string): Promise<void> => {
  await request<unknown>(`/api/file?path=${encodeURIComponent(path)}`, { method: "DELETE" });
};

const renameFile = async (from: string, to: string): Promise<void> => {
  await request<unknown>("/api/file/rename", {
    body: JSON.stringify({ from, to }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
};

const getFileHistory = (path: string): Promise<CommitEntry[]> =>
  request<CommitEntry[]>(`/api/file/history?path=${encodeURIComponent(path)}`);

const getFileDiff = (path: string, sha: string): Promise<DiffData> =>
  request<DiffData>(
    `/api/file/diff?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(sha)}`,
  );

const getImages = (): Promise<ImageEntry[]> => request<ImageEntry[]>("/api/images");

const deleteImage = async (filename: string): Promise<void> => {
  await request<unknown>(`/api/images/${encodeURIComponent(filename)}`, { method: "DELETE" });
};

const uploadImage = (file: File): Promise<{ url: string }> => {
  const form = new FormData();
  form.append("file", file);
  return request<{ url: string }>("/api/upload/image", { body: form, method: "POST" });
};

export type { DiffData, FileGetResponse, FileSaveResponse, ImageEntry, MeResponse };
export {
  ApiError,
  createFile,
  deleteFile,
  deleteImage,
  getFile,
  getFileDiff,
  getFileHistory,
  getImages,
  getMe,
  getTree,
  putFile,
  renameFile,
  searchPages,
  uploadImage,
};
