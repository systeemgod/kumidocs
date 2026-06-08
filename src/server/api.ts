import { apiBacklinks, apiPagesLookup } from "./backlinks";
import { buildFileTree, getFile } from "./filestore";
import type { Config } from "./config";
import type { User } from "@/lib/types";
import { getHeadSha } from "./git";
import { getPermissions } from "./auth";
import { searchDocs } from "./search";

// GET /api/me
async function apiMe(user: User, config: Config): Promise<Response> {
  const perms = getPermissions();
  let headSha = "";
  try {
    headSha = await getHeadSha(config);
  } catch {
    // Not a git repo or no commits yet
  }
  return Response.json({
    ...user,
    autoSaveDelay: config.autoSaveDelay,
    headSha,
    instanceName: perms.instanceName ?? config.instanceName,
    slideThemes: perms.slideThemes ?? {},
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

export { apiBacklinks, apiMe, apiPagesLookup, apiSearch, apiSidebar, apiTree };
export { apiFileCreate, apiFileDelete, apiFileGet, apiFilePut, apiFileRename } from "./api-file";
export { apiFileDiff, apiFileHistory } from "./api-history";
export {
  apiAvatarProxy,
  apiImageDelete,
  apiImagesList,
  apiUploadImage,
  serveRepoAsset,
} from "./api-images";
