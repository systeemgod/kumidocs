import {
  ChevronDownRegular,
  ChevronRightRegular,
  DismissRegular,
  DocumentRegular,
} from "@fluentui/react-icons";
import { getFileDiff, getFileHistory } from "@/lib/api";
import { useMemo, useState } from "react";
import CommitDiffDialog from "./commit-diff-dialog";
import type { CommitEntry } from "@/lib/types";
import type { DiffData } from "@/lib/api";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/ui/avatar";
import { emailToDisplayName } from "@/lib/avatar";
import useMountEffect from "@/hooks/use-mount-effect";

interface PageInfoPanelProps {
  filePath: string;
  title: string;
  onClose?: () => void;
}

export default function PageInfoPanel({
  filePath,
  title,
  onClose,
}: PageInfoPanelProps): JSX.Element {
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffData, setDiffData] = useState<DiffData | undefined>();
  const [diffLoading, setDiffLoading] = useState(false);

  // Group commits by calendar date with human-readable labels
  const commitGroups = useMemo(() => {
    const groups = new Map<string, { label: string; commits: CommitEntry[] }>();
    for (const commit of commits) {
      const date = new Date(commit.date);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      if (!groups.has(key)) {
        const label = date.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        groups.set(key, { commits: [], label });
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we just ensured this
      groups.get(key)!.commits.push(commit);
    }
    return [...groups.entries()];
  }, [commits]);

  const toggleGroup = (key: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  useMountEffect(() => {
    void (async (): Promise<void> => {
      try {
        const data = await getFileHistory(filePath);
        setCommits(data);
      } catch {
        setCommits([]);
      } finally {
        setLoading(false);
      }
    })();
  });

  const openDiff = async (sha: string): Promise<void> => {
    setDiffLoading(true);
    setDiffOpen(true);
    setDiffData(undefined);
    try {
      const data = await getFileDiff(filePath, sha);
      setDiffData(data);
    } catch {
      setDiffData(undefined);
    } finally {
      setDiffLoading(false);
    }
  };

  let commitHistoryContent: ReactNode;
  if (loading) {
    commitHistoryContent = <p className="text-xs text-muted-foreground py-2">Loading…</p>;
  } else if (commits.length === 0) {
    commitHistoryContent = <p className="text-xs text-muted-foreground py-2">No commits yet.</p>;
  } else {
    commitHistoryContent = (
      <div className="space-y-1">
        {commitGroups.map(([key, { label, commits: groupCommits }]) => {
          const isCollapsed = collapsedGroups.has(key);
          return (
            <div key={key}>
              {/* Date group header */}
              <button
                className="w-full flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent/40 select-none"
                onClick={() => {
                  toggleGroup(key);
                }}
              >
                {isCollapsed ? (
                  <ChevronRightRegular className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronDownRegular className="w-3 h-3 shrink-0" />
                )}
                <span className="font-medium">{label}</span>
                <span className="ml-auto tabular-nums">{groupCommits.length}</span>
              </button>
              {/* Commits */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {groupCommits.map((commit) => (
                    <button
                      key={commit.sha}
                      className="w-full text-left rounded py-1.5 text-xs hover:bg-accent/60 group flex items-start gap-1.5 transition-colors"
                      onClick={() => {
                        void openDiff(commit.sha);
                      }}
                    >
                      <UserAvatar
                        name={emailToDisplayName(commit.author)}
                        email={commit.authorEmail}
                        size="xs"
                        className="shrink-0 mt-0.5"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-foreground line-clamp-2 block">{commit.message}</span>
                        {(commit.added !== undefined || commit.removed !== undefined) && (
                          <span className="flex gap-1 mt-0.5">
                            {(commit.added ?? 0) > 0 && (
                              <span className="text-green-600 dark:text-green-400 font-mono">
                                +{commit.added}
                              </span>
                            )}
                            {(commit.removed ?? 0) > 0 && (
                              <span className="text-red-600 dark:text-red-400 font-mono">
                                -{commit.removed}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                      <ChevronRightRegular className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l border-border bg-sidebar flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <DocumentRegular className="w-4 h-4 shrink-0" />
          <span className="flex-1">Page info</span>
          {onClose && (
            <button
              className="ml-auto p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <DismissRegular className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Title + path */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Title
            </p>
            <p className="text-sm text-foreground break-words">{title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Path
            </p>
            <p className="text-sm font-mono text-foreground break-all">{filePath}</p>
          </div>

          {/* Commit history */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Commit history
            </p>
            {commitHistoryContent}
          </div>
        </div>
      </ScrollArea>

      <CommitDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        diffData={diffData}
        diffLoading={diffLoading}
      />
    </div>
  );
}
