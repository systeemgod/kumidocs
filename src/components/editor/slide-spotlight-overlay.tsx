import { ArrowLeft, Minimize, Mouse, Square } from "lucide-react";
import type { ParsedSlide, SlideThemeMap } from "@/lib/slide";
import ScaledSlide from "./scaled-slide";
import cn from "@/lib/utils";

interface SlideSpotlightOverlayProps {
  currentSlide: ParsedSlide;
  spotlightCallbackRef: (el: HTMLDivElement | null) => void;
  spotlightScale: number;
  pointerVisible: boolean;
  setPointerVisible: (update: (prev: boolean) => boolean) => void;
  pointerPos: { xPos: number; yPos: number };
  setPointerPos: (pos: { xPos: number; yPos: number }) => void;
  spotlightMenu: { xPos: number; yPos: number } | undefined;
  setSpotlightMenu: (menu: { xPos: number; yPos: number } | undefined) => void;
  next: () => void;
  prev: () => void;
  setIndex: (index: number) => void;
  theme: string;
  paginate: boolean;
  total: number;
  slideNum: number;
  slideThemes?: SlideThemeMap;
  themeVars?: Record<string, string>;
}

function SlideSpotlightOverlay({
  currentSlide,
  spotlightCallbackRef,
  spotlightScale,
  pointerVisible,
  setPointerVisible,
  pointerPos,
  setPointerPos,
  spotlightMenu,
  setSpotlightMenu,
  next,
  prev,
  setIndex,
  theme,
  paginate,
  total,
  slideNum,
  slideThemes,
  themeVars,
}: SlideSpotlightOverlayProps): JSX.Element {
  return (
    <div
      ref={spotlightCallbackRef}
      className={cn(
        "fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none",
        pointerVisible ? "cursor-none" : "cursor-default",
      )}
      onClick={() => {
        if (spotlightMenu) {
          setSpotlightMenu(undefined);
          return;
        }
        next();
      }}
      onMouseMove={(ev) => {
        setPointerPos({ xPos: ev.clientX, yPos: ev.clientY });
      }}
      onContextMenu={(ev) => {
        ev.preventDefault();
        setSpotlightMenu({ xPos: ev.clientX, yPos: ev.clientY });
      }}
    >
      <ScaledSlide
        slide={currentSlide}
        scale={spotlightScale}
        theme={theme}
        paginate={paginate}
        slideNum={slideNum}
        total={total}
        slideThemes={slideThemes}
        themeVars={themeVars}
      />
      {/* Laser pointer dot */}
      {pointerVisible && (
        <div
          aria-hidden="true"
          style={{
            backgroundColor: "rgba(255, 30, 30, 0.92)",
            borderRadius: "50%",
            boxShadow: "0 0 10px 8px rgba(255, 60, 60, 0.85), 0 0 36px 16px rgba(255, 0, 0, 0.5)",
            height: 18,
            left: pointerPos.xPos,
            pointerEvents: "none",
            position: "fixed",
            top: pointerPos.yPos,
            transform: "translate(-50%, -50%)",
            width: 18,
            zIndex: 10_000,
          }}
        />
      )}
      {/* Right-click menu — rendered inside fullscreen element so it's visible */}
      {spotlightMenu && (
        <div
          style={{
            left: spotlightMenu.xPos,
            position: "fixed",
            top: spotlightMenu.yPos,
            zIndex: 10_001,
          }}
          className="min-w-[200px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg py-1 text-sm"
          onClick={(ev) => {
            ev.stopPropagation();
          }}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
            onClick={async () => {
              try {
                await document.exitFullscreen();
              } catch {
                // ignore
              }
              setSpotlightMenu(undefined);
            }}
          >
            <Minimize size={14} />
            Exit fullscreen
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
            onClick={() => {
              window.location.reload();
            }}
          >
            <Square size={14} className="invisible" />
            Refresh
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
            onClick={() => {
              prev();
              setSpotlightMenu(undefined);
            }}
          >
            <ArrowLeft size={14} />
            Previous
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
            onClick={() => {
              setIndex(0);
              setSpotlightMenu(undefined);
            }}
          >
            <Square size={14} className="invisible" />
            Go to start
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
            onClick={() => {
              setPointerVisible((isVisible) => !isVisible);
              setSpotlightMenu(undefined);
            }}
          >
            <Mouse size={14} />
            {pointerVisible ? "Hide laser pointer" : "Show laser pointer"}
          </button>
        </div>
      )}
    </div>
  );
}

export default SlideSpotlightOverlay;
