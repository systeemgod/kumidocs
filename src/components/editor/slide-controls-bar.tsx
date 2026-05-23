import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  GalleryVertical,
  Maximize,
  Minimize,
  Spotlight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlideControlsBarProps {
  scrollMode: boolean;
  total: number;
  index: number;
  standalone: boolean;
  isFullscreen: boolean;
  isExporting: boolean;
  prev: () => void;
  next: () => void;
  setScrollMode: (mode: boolean) => void;
  toggleFullscreen: () => void;
  enterSpotlight: () => void;
  exportPdf: () => void;
}

function SlideControlsBar({
  scrollMode,
  total,
  index,
  standalone,
  isFullscreen,
  isExporting,
  prev,
  next,
  setScrollMode,
  toggleFullscreen,
  enterSpotlight,
  exportPdf,
}: SlideControlsBarProps): JSX.Element {
  return (
    <>
      {/* ── Progress bar (paginate mode only) ── */}
      {!scrollMode && (
        <div className="shrink-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{
              width: total > 0 ? `${String(((index + 1) / total) * 100)}%` : "0%",
            }}
          />
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-2 border-t border-border bg-background">
        {scrollMode ? (
          <span className="text-xs text-muted-foreground tabular-nums select-none">
            {total} {total === 1 ? "slide" : "slides"}
          </span>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={prev}
              disabled={index === 0}
              title="Previous slide (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-xs text-muted-foreground tabular-nums select-none min-w-[4rem] text-center">
              {index + 1} / {total}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={next}
              disabled={index === total - 1}
              title="Next slide (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {!standalone && (
          <>
            <div className="w-px h-4 bg-border mx-1" />

            <Button
              variant={scrollMode ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setScrollMode(true);
              }}
              title="Scroll mode"
            >
              <GalleryVertical className="w-4 h-4" />
            </Button>
            <Button
              variant={scrollMode ? "ghost" : "secondary"}
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setScrollMode(false);
              }}
              title="Paginate mode"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
          </>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={enterSpotlight}
          title="Spotlight — slide only fullscreen"
        >
          <Spotlight className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={exportPdf}
          disabled={isExporting}
          title="Export as PDF"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}

export default SlideControlsBar;
