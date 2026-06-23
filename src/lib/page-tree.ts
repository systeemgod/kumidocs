import type { PageNode, TreeNode } from "@/lib/types";

// Names always hidden from sidebar / TOC rendering
const HIDDEN_NAMES = new Set(["_sidebar.md"]);
// Directory names always hidden from sidebar / TOC rendering
const HIDDEN_DIR_NAMES = new Set(["images"]);

/**
 * Merge TreeNode[] (mixed files + dirs) into PageNode[]:
 * - dir "test-3/" + "test-3.md" -> one PageNode with children
 * - dir with no matching .md -> virtual ghost PageNode
 * - .md file with no matching dir -> leaf PageNode
 */
function buildPageTree(nodes: TreeNode[]): PageNode[] {
  const filtered = nodes.filter(
    (node) =>
      !HIDDEN_NAMES.has(node.name) && !(node.type === "dir" && HIDDEN_DIR_NAMES.has(node.name)),
  );

  const fileMap = new Map<string, TreeNode>();
  const dirMap = new Map<string, TreeNode>();

  for (const node of filtered) {
    if (node.type === "dir") {
      dirMap.set(node.name, node);
    } else {
      fileMap.set(node.name.replace(/\.md$/iu, ""), node);
    }
  }

  const result: PageNode[] = [];

  for (const [baseName, fileNode] of fileMap) {
    const dir = dirMap.get(baseName);
    result.push({
      children: dir ? buildPageTree(dir.children ?? []) : [],
      displayTitle: fileNode.fileEntry?.title ?? baseName.replaceAll(/[-_]/gu, " "),
      fileEntry: fileNode.fileEntry,
      isVirtual: false,
      path: fileNode.path,
    });
  }

  for (const [name, dirNode] of dirMap) {
    if (fileMap.has(name)) {
      continue;
    }
    result.push({
      children: buildPageTree(dirNode.children ?? []),
      displayTitle: name.replaceAll(/[-_]/gu, " "),
      fileEntry: undefined,
      isVirtual: true,
      path: `${dirNode.path}.md`,
    });
  }

  return result.toSorted((nodeA, nodeB) => {
    if (nodeA.path.endsWith("README.md")) {
      return -1;
    }
    if (nodeB.path.endsWith("README.md")) {
      return 1;
    }
    return nodeA.displayTitle.localeCompare(nodeB.displayTitle, undefined, { sensitivity: "base" });
  });
}

export default buildPageTree;
