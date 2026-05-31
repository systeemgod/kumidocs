import { Button } from "@/components/ui/button";
import FilePageHeader from "./file-page-header";
import MarkdownViewer from "@/components/editor/markdown-viewer";
import NotFound from "./not-found";
import PageInfoPanel from "@/components/layout/page-info-panel";
import TocSidebar from "@/components/editor/toc-sidebar";
import { SaveRegular } from "@fluentui/react-icons";
import { buildEditorContent } from "./file-page-utils";
import { useFilePage } from "./use-file-page";

export default function FilePage(): JSX.Element {
  const {
    rawPath,
    filePath,
    user,
    slideThemes,
    content,
    rawContent,
    meta,
    setMeta,
    saveStatus,
    lastSha,
    loading,
    notFound,
    metaRef,
    loadDoc,
    handleChange,
    handleSave,
    editMode,
    editLocked,
    viewers,
    infoOpen,
    setInfoOpen,
    tocOpen,
    setTocOpen,
    remoteBanner,
    setRemoteBanner,
    pdfContentRef,
    openMove,
    openDelete,
    pageActionDialogs,
    enterEdit,
    exitEdit,
    handleEmojiChange,
    handlePageDuplicate,
    exportPagePdf,
    fileType,
    title,
    rawExt,
    breadcrumb,
  } = useFilePage();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  const editorContent = buildEditorContent({
    content,
    editMode,
    fileType,
    handleChange,
    handleSave,
    meta,
    metaRef,
    rawContent,
    rawExt,
    setMeta,
    slideThemes,
    title,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Remote change banner */}
      {remoteBanner !== undefined && remoteBanner !== "" && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <span className="flex-1">{remoteBanner} while you have unsaved changes.</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={async () => {
              try {
                await loadDoc(filePath);
              } catch (error: unknown) {
                console.error("Failed to reload document:", error);
              }
              setRemoteBanner(undefined);
            }}
          >
            Reload
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={() => {
              setRemoteBanner(undefined);
            }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Page header */}
      <FilePageHeader
        meta={meta}
        fileType={fileType}
        title={title}
        user={user}
        editMode={editMode}
        editLocked={editLocked}
        viewers={viewers}
        saveStatus={saveStatus}
        infoOpen={infoOpen}
        tocOpen={tocOpen}
        rawPath={rawPath}
        filePath={filePath}
        handleEmojiChange={handleEmojiChange}
        exitEdit={exitEdit}
        enterEdit={enterEdit}
        setInfoOpen={setInfoOpen}
        setTocOpen={setTocOpen}
        handlePageDuplicate={() => {
          void handlePageDuplicate();
        }}
        exportPagePdf={() => {
          void exportPagePdf();
        }}
        openMove={openMove}
        openDelete={() => {
          openDelete(filePath);
        }}
      />

      {/* Content area — breadcrumbs in left column so side panels get full height */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Breadcrumb (only spans content width, not behind TOC/PageInfo) */}
          {breadcrumb.length > 0 && (
            <div className="px-4 py-0.5 text-xs text-muted-foreground border-b border-border shrink-0">
              {breadcrumb.join(" / ")}
            </div>
          )}
          <div className="flex-1 overflow-hidden flex flex-col">{editorContent}</div>
        </div>
        {/* TOC sidebar — doc pages only, view mode */}
        {tocOpen && !editMode && fileType === "doc" && (
          <TocSidebar
            content={content}
            onClose={() => {
              setTocOpen(false);
            }}
          />
        )}
        {infoOpen && !editMode && (
          <PageInfoPanel
            key={filePath}
            filePath={filePath}
            title={title}
            onClose={() => {
              setInfoOpen(false);
              localStorage.removeItem("kumidocs:info-open");
            }}
          />
        )}
      </div>

      {/* Footer */}
      {lastSha !== undefined && lastSha !== "" && (
        <div className="px-4 py-1 border-t border-border text-xs text-muted-foreground shrink-0 flex items-center gap-2">
          <SaveRegular className="w-3 h-3" />
          <span>
            Last saved · <code className="font-mono">{lastSha}</code>
          </span>
        </div>
      )}

      {/* Off-screen render container for PDF export */}
      {fileType === "doc" && (
        <div
          ref={pdfContentRef}
          aria-hidden="true"
          style={{
            left: 0,
            pointerEvents: "none",
            position: "fixed",
            top: 0,
            width: 800,
            zIndex: -9999,
          }}
        >
          <MarkdownViewer value={content} />
        </div>
      )}

      {/* Move + Delete dialogs (shared hook) */}
      {pageActionDialogs}
    </div>
  );
}
