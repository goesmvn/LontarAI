"use client";

import { useRef, useState } from "react";
import type { Rect } from "@/lib/area";
import { clampRect } from "@/lib/area";

type Drag =
  | { kind: "new"; ox: number; oy: number }
  | { kind: "move"; ox: number; oy: number; start: Rect }
  | { kind: "resize"; corner: "nw" | "ne" | "sw" | "se"; start: Rect };

const MIN = 0.02;

/** Image with a draggable/resizable selection rectangle (normalised coordinates). */
export default function CropSelector({
  src, zoom, active, rect, onRect, suggestions, onPickSuggestion, onLoad, lines, activeLine,
}: {
  src: string; zoom: number; active: boolean; rect: Rect | null; onRect: (r: Rect | null) => void;
  suggestions?: Rect[]; onPickSuggestion?: (r: Rect) => void; onLoad?: (w: number, h: number) => void;
  lines?: Rect[]; activeLine?: number | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const pos = (e: React.PointerEvent) => {
    const b = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) };
  };

  const down = (e: React.PointerEvent) => {
    if (!active) return;
    const p = pos(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (rect && p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h) {
      setDrag({ kind: "move", ox: p.x, oy: p.y, start: rect });
    } else {
      setDrag({ kind: "new", ox: p.x, oy: p.y });
      onRect({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };
  const startResize = (corner: "nw" | "ne" | "sw" | "se") => (e: React.PointerEvent) => {
    if (!rect) return;
    e.stopPropagation();
    box.current?.setPointerCapture(e.pointerId);
    setDrag({ kind: "resize", corner, start: rect });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = pos(e);
    if (drag.kind === "new") {
      onRect({ x: Math.min(drag.ox, p.x), y: Math.min(drag.oy, p.y), w: Math.abs(p.x - drag.ox), h: Math.abs(p.y - drag.oy) });
    } else if (drag.kind === "move") {
      const s = drag.start;
      const x = Math.min(1 - s.w, Math.max(0, s.x + p.x - drag.ox)), y = Math.min(1 - s.h, Math.max(0, s.y + p.y - drag.oy));
      onRect({ ...s, x, y });
    } else {
      const s = drag.start;
      const left = drag.corner.includes("w") ? p.x : s.x, right = drag.corner.includes("e") ? p.x : s.x + s.w;
      const top = drag.corner.includes("n") ? p.y : s.y, bottom = drag.corner.includes("s") ? p.y : s.y + s.h;
      onRect(clampRect({ x: Math.min(left, right), y: Math.min(top, bottom), w: Math.abs(right - left), h: Math.abs(bottom - top) }));
    }
  };
  const up = () => {
    setDrag(null);
    if (rect && (rect.w < MIN || rect.h < MIN)) onRect(null);
  };

  const pct = (r: Rect) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
  const handle = (c: "nw" | "ne" | "sw" | "se") => (
    <span key={c} onPointerDown={startResize(c)}
      className={`absolute w-4 h-4 bg-white border-2 border-primary rounded-sm touch-none ${c === "nw" ? "-left-2 -top-2 cursor-nwse-resize" : c === "ne" ? "-right-2 -top-2 cursor-nesw-resize" : c === "sw" ? "-left-2 -bottom-2 cursor-nesw-resize" : "-right-2 -bottom-2 cursor-nwse-resize"}`} />
  );

  return (
    <div ref={box} className={`relative select-none ${active ? "cursor-crosshair touch-none" : ""}`} style={{ width: `${zoom}%` }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Foto lempir lontar" draggable={false} className="block w-full h-auto max-w-none"
        onLoad={(e) => onLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} />
      {active && !rect && <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-3"><span className="px-3 py-1 rounded-full bg-white/95 text-xs text-stone-800 shadow">Tarik pada gambar untuk memilih area</span></div>}
      {active && suggestions?.map((s, i) => (
        <button key={i} type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onPickSuggestion?.(s)} style={pct(s)}
          className="absolute border-2 border-dashed border-amber-400 bg-amber-300/10 hover:bg-amber-300/25 rounded-sm">
          <span className="absolute -top-0.5 left-0 -translate-y-full px-1.5 py-0.5 rounded bg-amber-400 text-[10px] font-mono font-semibold text-stone-900">Area {i + 1}</span>
        </button>
      ))}
      {lines?.map((l, i) => (
        <div key={`l${i}`} style={pct(l)} className={`absolute pointer-events-none border ${activeLine === i ? "border-primary bg-primary/15" : "border-sky-400 bg-sky-300/10"} rounded-[2px]`}>
          <span className={`absolute -left-0.5 -top-0.5 -translate-y-full px-1 rounded text-[9px] font-mono font-semibold ${activeLine === i ? "bg-primary text-white" : "bg-sky-500 text-white"}`}>{i + 1}</span>
        </div>
      ))}
      {rect && rect.w > 0 && rect.h > 0 && (
        <div className="absolute border-2 border-primary" style={{ ...pct(rect), boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}>
          {active && (["nw", "ne", "sw", "se"] as const).map(handle)}
        </div>
      )}
    </div>
  );
}
