import { buildFileTree, getFile } from "./filestore";
import type { Config } from "./config";
import type { User } from "@/lib/types";
import { getPermissions } from "./auth";
import { searchDocs } from "./search";

// GET /api/me
function apiMe(user: User, config: Config): Response {
  return Response.json({
    ...user,
    autoSaveDelay: config.autoSaveDelay,
    instanceName: config.instanceName,
    slideThemes: getPermissions().slideThemes ?? {},
  });
}

// GET /api/tree
function apiTree(): Response {
  return Response.json(buildFileTree());
}

// GET /api/search?q=<query>
function apiSearch(url: URL): Response {
  const query = url.searchParams.get("q") ?? "";
  return Response.json(searchDocs(query));
}

// GET /api/sidebar
function apiSidebar(): Response {
  const content = getFile("_sidebar.md") ?? "";
  return Response.json({ content });
}

export { apiMe, apiSearch, apiSidebar, apiTree };
export { apiFileGet, apiFilePut, apiFileCreate, apiFileDelete, apiFileRename } from "./api-file";
export {
  apiUploadImage,
  apiImagesList,
  apiImageDelete,
  serveRepoAsset,
  apiAvatarProxy,
} from "./api-images";
export { apiFileHistory, apiFileDiff } from "./api-history";
