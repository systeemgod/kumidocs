import type { ReactNode } from "react";
import type { TreeNode } from "@/lib/types";
import { createContext, useContext } from "react";

interface PageContextValue {
  /** Raw file path of the current page (e.g. "docs/guide.md"). */
  pagePath: string;
  /** Full file tree from the server. */
  tree: TreeNode[];
}

const PageContext = createContext<PageContextValue>({ pagePath: "", tree: [] });

function usePageContext(): PageContextValue {
  return useContext(PageContext);
}

function PageContextProvider({
  pagePath,
  tree,
  children,
}: PageContextValue & { children: ReactNode }): JSX.Element {
  return <PageContext.Provider value={{ pagePath, tree }}>{children}</PageContext.Provider>;
}

export { PageContextProvider, usePageContext };
export type { PageContextValue };
