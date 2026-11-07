"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import dynamic from "next/dynamic";
import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { resizeToJpeg } from "@/lib/image";
import { enhanceImage } from "@/lib/cv";
import { latinToBali } from "@/lib/aksara";
import { buildExport, downloadJson } from "@/lib/export";
import PrintCertificate from "@/components/PrintCertificate";
import CropSelector from "@/components/CropSelector";
import { cropImage, detectTextRegions, type Rect } from "@/lib/area";
import { segmentLines } from "@/lib/lines";
import { referenceChart } from "@/lib/glyphChart";
import { segmentGlyphs, markedTiles, cutGlyphs } from "@/lib/glyphs";
import { markedExamples } from "@/lib/glyphExamples";
import { assemble, defaultTrie, loadExtraLexicon, type Cand, type Token } from "@/lib/lexicon";
import { AFFILIATIONS, CATEGORY_LABELS, REGENCIES } from "@/lib/regencies";
import type { AnalysisResult } from "@/lib/ai/schema";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-60 rounded-xl bg-stone-100" />,
});

type Line = AnalysisResult["lines"][number];

const emptyAnalysis = (n = 4): AnalysisResult => ({
  category: "lainnya",
  lines: Array.from({ length: n }, (_, k) => ({ index: k + 1, block: "penuh" as const, unicode: "", latin: "", confidence: 0 })),
  translation: { indonesian: "", english: "" },
  philosophical_context: "",
  confidence_score: 0,
  warnings: [],
  unicode_transcription: "",
  latin_transliteration: "",
  model: "manual",
  prompt_version: "-",
  status: "draf_ai",
});

const band = (c: number) => (c >= 0.75 ? ["Tinggi", "text-green-700"] : c >= 0.45 ? ["Sedang", "text-amber-700"] : ["Rendah", "text-red-700"]);

export default function StudioPage() {
  const { session } = useSession();
  const [image, setImage] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [enhancedImg, setEnhancedImg] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [source, setSource] = useState<"asli" | "enhanced">("asli");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [edited, setEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"id" | "en">("id");
  const [copied, setCopied] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [manualUnicode, setManualUnicode] = useState<Set<number>>(new Set());
  const [showGuide, setShowGuide] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [suggestions, setSuggestions] = useState<Rect[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [lineRects, setLineRects] = useState<Rect[]>([]);
  const [lineThumbs, setLineThumbs] = useState<string[]>([]);
  const [segmenting, setSegmenting] = useState(false);
  const [sens, setSens] = useState(0.35);
  const [reading, setReading] = useState(false);
  const [splitKey, setSplitKey] = useState("");
  const [lineGlyphs, setLineGlyphs] = useState<Record<number, { thumbs: string[]; cands: Cand[][]; tokens: Token[] }>>({});
  const [aiLines, setAiLines] = useState<Record<number, number>>({});
  const [aiOriginal, setAiOriginal] = useState<Record<number, string>>({});
  const [shareTraining, setShareTraining] = useState(false);
  const [trainingNote, setTrainingNote] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [condition, setCondition] = useState<"baik" | "rapuh" | "rusak_sebagian" | "fragmentaris">("baik");

  // save form
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [affiliation, setAffiliation] = useState("Pribadi");
  const [era, setEra] = useState("");
  const [regency, setRegency] = useState("Gianyar");
  const [banjar, setBanjar] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [pingit, setPingit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ visibility: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const analyze = async (img: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setEdited(false);
    try {
      const res = await fetch("/api/studio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan.");
        return;
      }
      setAnalysis(data.data);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  };

  const load = async (blob: Blob) => {
    setError(null);
    try {
      const img = await resizeToJpeg(blob);
      setImage(img);
      setEnhancedImg(null);
      setEnhanced(false);
      setSource("asli");
      setSaved(null);
      setAnalysis(null);
      setManualUnicode(new Set());
      setZoom(100);
    } catch {
      setError("Gagal membaca gambar.");
    }
  };

  const toggleEnhanced = async (on: boolean) => {
    setEnhanced(on);
    if (on && image && !enhancedImg) {
      setEnhancing(true);
      try { setEnhancedImg(await enhanceImage(image)); } catch { setEnhanced(false); setError("Gagal meningkatkan gambar."); }
      setEnhancing(false);
    }
  };

  const reanalyzeEnhanced = async () => {
    if (!enhancedImg) return;
    setSource("enhanced");
    analyze(enhancedImg);
  };

  const SAMPLE_LIST = [
    { id: "krakah", label: "Sampel: Krakah Sanggaraha", file: "/samples/krakah-sanggaraha.webp", title: "Krakah Sanggaraha" },
  ];
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const loadSample = async (id = "krakah") => {
    const sm = SAMPLE_LIST.find((x) => x.id === id) ?? SAMPLE_LIST[0];
    const res = await fetch(sm.file);
    setActiveSample(sm.id);
    load(await res.blob());
  };

  // Deep link from the landing page: /studio?sample=krakah
  useEffect(() => {
    { const sp = new URLSearchParams(window.location.search).get("sample"); if (sp) loadSample(sp); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const viewSrc = () => (enhanced && enhancedImg ? enhancedImg : image!);
  const hasRect = !!rect && rect.w > 0.02 && rect.h > 0.02;
  const autoDetect = async () => {
    if (!image) return;
    setDetecting(true); setError(null);
    try {
      const found = await detectTextRegions(image);
      setSuggestions(found);
      if (found.length === 0) setError("Tidak ada area aksara yang terdeteksi. Tarik area secara manual.");
      else if (found.length === 1) setRect(found[0]);
    } catch { setError("Gagal mendeteksi area."); }
    setDetecting(false);
  };
  const areaKey = () => (hasRect && rect ? [rect.x, rect.y, rect.w, rect.h].map((v) => v.toFixed(4)).join(",") : "full");
  // Split the selected area (or whole image) into text lines. Returns the new rects + analysis so callers can chain.
  const splitLines = async (fresh = false): Promise<{ rects: Rect[]; analysis: AnalysisResult } | null> => {
    if (!image) return null;
    setSegmenting(true); setError(null);
    try {
      const rects = await segmentLines(image, hasRect ? rect : null, sens);
      if (rects.length === 0) { setError("Baris tidak terdeteksi. Pilih area yang lebih sempit atau tambah baris manual."); setSegmenting(false); return null; }
      const thumbs = await Promise.all(rects.map((r) => cropImage(image, r, 700)));
      const base = !fresh && analysis && analysis.model === "manual" ? analysis : emptyAnalysis(0);
      const lines = rects.map((_, k) => base.lines[k] ?? { index: k + 1, block: "penuh" as const, unicode: "", latin: "", confidence: 0 }).map((l, k) => ({ ...l, index: k + 1 }));
      const next = { ...base, lines };
      setLineRects(rects); setLineThumbs(thumbs); setAiLines({}); setAiOriginal({}); setLineGlyphs({}); setSplitKey(areaKey());
      setAnalysis(next);
      setManualUnicode(new Set());
      setSegmenting(false);
      return { rects, analysis: next };
    } catch { setError("Gagal membagi baris."); }
    setSegmenting(false);
    return null;
  };

  // One click: split the selection into lines (if not done for this exact area), then let the AI read them.
  const checkWithAI = async () => {
    if (!image) return;
    let rects = lineRects, an = analysis;
    if (rects.length === 0 || splitKey !== areaKey() || !an) {
      const r = await splitLines(splitKey !== areaKey());
      if (!r) return;
      rects = r.rects; an = r.analysis;
    }
    await readLinesAI(rects, an);
  };

  // Reading pipeline (parameters intentionally shadow the state: callers pass freshly computed values):
  //   1) split each line into character clusters  2) read every cluster (numbered boxes, line context kept)
  //   3) assemble words with the lexicon          4) write Aksara Bali Unicode, then Latin.
  const readLinesAI = async (lineRects: Rect[], analysis: AnalysisResult | null) => {
    if (!image || lineRects.length === 0 || !analysis) return;
    setReading(true); setError(null);
    try {
      const idx = lineRects.map((_, i) => i).filter((i) => !analysis.lines[i]?.latin.trim()).slice(0, 8);
      if (idx.length === 0) { setError("Semua baris sudah terisi. Kosongkan baris yang ingin dibaca AI."); setReading(false); return; }
      const [chart, shots, extra] = await Promise.all([referenceChart(), markedExamples(3), loadExtraLexicon()]);
      const trie = defaultTrie(extra);
      // Stage 1: character clusters per line
      const perLine = await Promise.all(idx.map(async (i) => {
        const lineImg = await cropImage(image, lineRects[i], 2400);
        const boxes = await segmentGlyphs(lineImg);
        return { i, boxes, tiles: boxes.length ? await markedTiles(lineImg, boxes, 12) : [], thumbs: boxes.length ? await cutGlyphs(lineImg, boxes, 110) : [] };
      }));
      const flat = perLine.flatMap((p) => p.tiles.map((t) => ({ p, t })));
      if (flat.length === 0) { setError("Karakter tidak terdeteksi pada baris-baris ini. Coba area yang lebih ketat atau foto yang lebih tajam."); setReading(false); return; }
      if (flat.length > 40) { setError("Terlalu banyak karakter terdeteksi (foto beresolusi rendah atau area terlalu luas). Pilih area dengan lebih sedikit baris, atau gunakan foto yang lebih tajam."); setReading(false); return; }
      // Stage 2: read every cluster (sent in batches of 20 tiles)
      const sheetsOut: Cand[][][] = [];
      for (let off = 0; off < flat.length; off += 20) {
        const part = flat.slice(off, off + 20);
        const res = await fetch("/api/studio/read-glyphs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chart, shots, sheets: part.map((f) => ({ image: f.t.image, count: f.t.count })) }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Gagal membaca karakter."); setReading(false); return; }
        sheetsOut.push(...(data.sheets as Cand[][][]));
      }
      const cellsByLine = new Map<number, Cand[][]>();
      flat.forEach((f, k) => { cellsByLine.set(f.p.i, [...(cellsByLine.get(f.p.i) ?? []), ...sheetsOut[k]]); });
      // Stage 3 + 4: assemble with lexicon, write aksara + Latin
      const glyphs = { ...lineGlyphs }; const marks: Record<number, number> = { ...aiLines }; const orig: Record<number, string> = {};
      const lines = analysis.lines.map((l, k) => {
        const p = perLine.find((x) => x.i === k); const cells = cellsByLine.get(k);
        if (!p || !cells) return l;
        const tokens = assemble(cells, trie);
        const latin = tokens.map((t) => t.text).join(" ");
        const conf = cells.length ? cells.reduce((sum, c) => sum + (c[0] && !/^[?-]$/.test(c[0].cand) ? Math.min(1, (c[0].runs ?? 1) / 2) : 0), 0) / cells.length : 0;
        glyphs[k] = { thumbs: p.thumbs, cands: cells, tokens };
        marks[k] = conf; orig[k] = conf >= 0.15 ? latin : "";
        return conf >= 0.15 ? { ...l, latin, unicode: tokens.map((t) => latinToBali(t.text)).join(" ") } : l;
      });
      setLineGlyphs(glyphs);
      setAiLines(marks);
      setAiOriginal((o) => ({ ...o, ...orig }));
      if (Object.values(orig).every((t) => !t)) setError("AI tidak cukup yakin untuk menyusun baris-baris ini (foto kurang tajam atau tulisan terlalu pudar). Karakter per karakter tetap ditampilkan di bawah tiap baris; isi manual dengan bantuannya.");
      setAnalysis({ ...analysis, lines, unicode_transcription: lines.map((l) => l.unicode).join("\n"), latin_transliteration: lines.map((l) => l.latin).join("\n") });
      setEdited(true);
    } catch { setError("Gagal terhubung ke server."); }
    setReading(false);
  };

  const applyCrop = async () => {
    if (!image || !rect) return;
    try {
      const cropped = await cropImage(image, rect);
      if (!fullImage) setFullImage(image);
      setLineRects([]); setLineThumbs([]); setAiLines({}); setAiOriginal({}); setLineGlyphs({}); setImage(cropped); setEnhancedImg(null); setEnhanced(false); setSource("asli");
      setRect(null); setSuggestions([]); setCropMode(false); setZoom(100); setDims(null);
    } catch { setError("Gagal memotong area."); }
  };
  const restoreFull = () => {
    if (!fullImage) return;
    setLineRects([]); setLineThumbs([]); setAiLines({}); setImage(fullImage); setFullImage(null); setEnhancedImg(null); setEnhanced(false); setRect(null); setSuggestions([]); setDims(null);
  };

  const reset = () => {
    setFullImage(null); setRect(null); setSuggestions([]); setCropMode(false); setLineRects([]); setLineThumbs([]); setAiLines({});
    setImage(null); setAnalysis(null); setError(null); setSaved(null); setEdited(false); setManualUnicode(new Set());
  };

  const updateLine = (i: number, patch: Partial<Line>) => {
    if (!analysis) return;
    const lines = analysis.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    setAnalysis({
      ...analysis, lines,
      unicode_transcription: lines.map((l) => l.unicode).join("\n"),
      latin_transliteration: lines.map((l) => l.latin).join("\n"),
    });
    setEdited(true);
  };

  const renumber = (lines: Line[]) => lines.map((l, k) => ({ ...l, index: k + 1 }));
  const commitLines = (lines: Line[]) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis, lines,
      unicode_transcription: lines.map((l) => l.unicode).join("\n"),
      latin_transliteration: lines.map((l) => l.latin).join("\n"),
    });
    setEdited(true);
  };
  const changeLatin = (i: number, latin: string) => {
    if (!analysis) return;
    const auto = !manualUnicode.has(i);
    commitLines(analysis.lines.map((l, idx) => (idx === i ? { ...l, latin, unicode: auto ? latinToBali(latin) : l.unicode } : l)));
  };
  const changeUnicode = (i: number, unicode: string) => {
    if (!analysis) return;
    setManualUnicode(new Set(manualUnicode).add(i));
    commitLines(analysis.lines.map((l, idx) => (idx === i ? { ...l, unicode } : l)));
  };
  const addLine = () => analysis && commitLines(renumber([...analysis.lines, { index: 0, block: "penuh", unicode: "", latin: "", confidence: 0 }]));
  const removeLine = (i: number) => {
    if (!analysis) return;
    commitLines(renumber(analysis.lines.filter((_, k) => k !== i)));
    setManualUnicode(new Set());
    setLineRects((r) => r.filter((_, k) => k !== i)); setLineThumbs((t) => t.filter((_, k) => k !== i));
  };
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch {}
  };
  const insertChar = (ch: string) => {
    const el = document.activeElement as HTMLTextAreaElement | null;
    if (!el || el.dataset.latin === undefined) return;
    const i = Number(el.dataset.latin);
    const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
    changeLatin(i, el.value.slice(0, a) + ch + el.value.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + ch.length, a + ch.length); });
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => setSaveError("Izinkan akses lokasi atau pilih titik di peta.")
    );
  };

  const canSave =
    !!analysis && !!image && !!title.trim() && !!owner.trim() && !!banjar.trim() && lat != null &&
    (visibility === "private" || (consent && !pingit));

  // Lines that may be donated as OCR training data: verified by the user (typed, or an AI draft they changed), complete, with a crop.
  const eligibleLines = () => {
    if (!analysis) return [] as number[];
    return analysis.lines.map((l, i) => i).filter((i) => {
      const l = analysis.lines[i];
      if (!lineRects[i] || !l.latin.trim() || l.latin.includes("[?]")) return false;
      return aiOriginal[i] === undefined || aiOriginal[i].trim() !== l.latin.trim();
    });
  };
  const submitTraining = async (manuscriptId: string, token: string) => {
    if (!image || !analysis) return;
    const idx = eligibleLines();
    if (idx.length === 0) { setTrainingNote("Tidak ada baris yang memenuhi syarat untuk disumbangkan."); return; }
    try {
      const samples = await Promise.all(idx.map(async (i) => ({
        line_index: i, image: await cropImage(image, lineRects[i], 1000, 96), latin: analysis.lines[i].latin.trim(),
        unicode: analysis.lines[i].unicode, origin: aiOriginal[i] !== undefined ? "ai_corrected" : "manual",
      })));
      const res = await fetch("/api/training", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ manuscript_id: manuscriptId, samples }) });
      const d = await res.json();
      setTrainingNote(res.ok ? `${d.saved} baris disumbangkan sebagai data latih. Terima kasih!` : d.error || "Gagal menyumbangkan data latih.");
    } catch { setTrainingNote("Gagal menyumbangkan data latih."); }
  };

  const save = async () => {
    if (!analysis || !image || !session) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/manuscripts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title, category: analysis.category, owner_name: owner, affiliation,
          estimated_creation_era: era || undefined, physical_condition: condition,
          regency, village_banjar: banjar, latitude: lat, longitude: lng,
          visibility, is_pingit: pingit, consent_public: consent, show_owner_name: showOwner,
          image,
          analysis: {
            unicode_transcription: analysis.unicode_transcription,
            latin_transliteration: analysis.latin_transliteration,
            translation: analysis.translation,
            philosophical_context: analysis.philosophical_context,
            confidence_score: analysis.confidence_score,
            status: edited ? "dikoreksi" : "draf_ai",
            lines: analysis.lines, model: analysis.model, prompt_version: analysis.prompt_version,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) setSaveError(data.error || "Gagal menyimpan.");
      else {
        setSaved({ visibility });
        if (shareTraining && !pingit && data.id) await submitTraining(data.id, session.access_token);
      }
    } catch {
      setSaveError("Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-terra-50 text-primary flex items-center justify-center"><Icon name={saved.visibility === "public" ? "public" : "lock"} size={34} /></div>
        <h1 className="font-serif text-3xl text-stone-900 mb-2">Naskah tersimpan</h1>
        {trainingNote && <p className="text-sm text-emerald-700 mb-3">{trainingNote}</p>}
        <p className="text-stone-600 mb-6">
          {saved.visibility === "public"
            ? "Naskah kini tampil di Arsip Publik. Lokasi ditampilkan sebagai area (±1 km), bukan titik tepat. Anda dapat mencabutnya kapan saja di Vault."
            : "Naskah tersimpan di Private Vault. Hanya Anda yang dapat melihatnya."}
        </p>
        <div className="flex flex-col gap-2 items-center">
          <Link href="/vault" className="px-6 py-2.5 rounded-full bg-terra-600 text-white font-semibold">Buka Vault</Link>
          <button type="button" onClick={reset} className="px-5 py-2 rounded-full bg-stone-100 text-stone-700">Pindai naskah lain</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-6 border-b border-linen-line">
        <div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            <h1 className="font-serif text-3xl lg:text-4xl text-stone-900 font-semibold">Studio Transkripsi</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 font-mono text-xs text-stone-600">ViT 1.5</span>
          </div>
          <p className="text-sm text-stone-500 mt-1">Unggah foto lempir lontar atau pilih sampel uji coba.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            {SAMPLE_LIST.map((sm) => (
              <button key={sm.id} type="button" onClick={() => loadSample(sm.id)}
                className={`px-3 py-1.5 rounded-lg text-xs ${activeSample === sm.id ? "bg-white text-stone-900 font-medium shadow-sm" : "text-stone-600 hover:text-stone-900"}`}>
                {sm.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-linen border border-linen-line text-stone-800 text-xs font-semibold shadow-sm cursor-pointer">
            <Icon name="add_photo_alternate" size={18} className="text-primary" /> + Unggah Foto Naskah
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setActiveSample(null); load(f); } e.target.value = ""; }} />
          </label>
        </div>
      </div>
      <p className="hidden text-stone-600 text-sm mt-1 mb-6">
        Foto lempir lontar → transkripsi (manual, dengan bantuan konversi aksara dan AI opsional) → simpan privat atau bagikan ke arsip publik.
      </p>

      {!image && (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
          <p className="text-stone-700">Unggah foto satu lempir lontar (JPG, PNG, atau WebP).</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <label className="px-5 py-2.5 rounded-full bg-terra-600 text-white font-semibold cursor-pointer hover:bg-terra-700">
              Pilih / Ambil Foto
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={() => loadSample()} className="px-5 py-2.5 rounded-full bg-white border border-terra-300 text-terra-800 font-medium hover:bg-amber-50">
              Coba sampel: Krakah Sanggaraha
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Sampel: koleksi Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali (dipakai dengan izin). Foto dengan resolusi lebih tinggi
            dan satu lempir per foto memberi hasil lebih baik.
          </p>
        </div>
      )}

      {image && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: viewer */}
          <div className="min-w-0 bg-white rounded-3xl border border-stone-200 overflow-hidden self-start shadow-[0_2px_12px_rgba(24,24,27,0.03)] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amberink-700 shrink-0" />
                <span className="truncate">{title.trim() ? `Lempir: ${title}` : activeSample ? SAMPLE_LIST.find((x) => x.id === activeSample)?.title : "Lempir Unggahan"}</span>
                {dims && <span className="font-mono text-[11px] text-stone-400 shrink-0">{dims.w}×{dims.h}px</span>}
              </h2>
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                <button type="button" onClick={() => toggleEnhanced(false)} className={`px-3 py-1 rounded-lg text-xs ${!enhanced ? "bg-white text-stone-900 font-medium shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>Asli</button>
                <button type="button" onClick={() => toggleEnhanced(true)} className={`px-3 py-1 rounded-lg text-xs ${enhanced ? "bg-white text-stone-900 font-medium shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
                  {enhancing ? "Memproses…" : "Kontras Tinggi"}
                </button>
                <button type="button" onClick={() => { setCropMode(!cropMode); if (cropMode) { setRect(null); setSuggestions([]); } }}
                  className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 ${cropMode ? "bg-primary text-white font-medium" : "text-stone-500 hover:text-stone-900"}`}>
                  <Icon name="crop" size={15} /> Pilih Area
                </button>
                <span className="flex items-center gap-0.5 pl-1 text-stone-600">
                  <button type="button" aria-label="Perkecil" onClick={() => setZoom(Math.max(100, zoom - 25))} className="p-1 hover:text-stone-900"><Icon name="zoom_out" size={16} /></button>
                  <span className="text-xs font-mono w-10 text-center">{zoom}%</span>
                  <button type="button" aria-label="Perbesar" onClick={() => setZoom(Math.min(500, zoom + 25))} className="p-1 hover:text-stone-900"><Icon name="zoom_in" size={16} /></button>
                </span>
              </div>
            </div>
            <div className="bg-stone-50 p-6 flex-1">
              <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                <div className="relative overflow-auto max-h-[60vh] rounded-xl bg-stone-900">
                  <CropSelector src={viewSrc()} zoom={zoom} active={cropMode} rect={rect} onRect={setRect}
                    suggestions={suggestions} onPickSuggestion={(r) => { setRect(r); setSuggestions([]); }}
                    onLoad={(w, h) => setDims({ w, h })} lines={lineRects} activeLine={activeLine} />
                </div>
              </div>
              {cropMode && (
                <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-stone-600 mr-auto">
                    {lineRects.length > 0 && <b className="text-sky-700 mr-2">{lineRects.length} baris terdeteksi.</b>}{hasRect && dims ? <>Area dipilih: <b className="font-mono text-stone-900">{Math.round(rect!.w * dims.w)}×{Math.round(rect!.h * dims.h)}px</b></> : "Tarik pada gambar, atau gunakan deteksi otomatis."}
                  </span>
                  <button type="button" onClick={autoDetect} disabled={detecting} className="px-3 py-1.5 rounded-lg bg-amberink-100 border border-amberink-200 text-amberink-700 font-medium flex items-center gap-1 disabled:opacity-50">
                    <Icon name="auto_fix_high" size={15} />{detecting ? "Mendeteksi…" : "Deteksi Area Otomatis"}
                  </button>
                  <label className="flex items-center gap-1.5 text-[11px] text-stone-500" title="Kanan: baris samar ikut terdeteksi. Kiri: hanya baris yang jelas.">
                    Kepekaan <input type="range" min={0.12} max={0.6} step={0.01} value={0.72 - sens} onChange={(e) => setSens(0.72 - Number(e.target.value))} className="w-20 accent-[#a83223]" />
                  </label>
                  <button type="button" onClick={() => splitLines(splitKey !== areaKey())} disabled={segmenting || reading} className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-medium flex items-center gap-1 disabled:opacity-50"><Icon name="format_line_spacing" size={15} />{segmenting ? "Membagi…" : "Bagi per Baris"}</button>
                  <button type="button" onClick={applyCrop} disabled={!hasRect} className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 font-medium flex items-center gap-1 disabled:opacity-40"><Icon name="crop" size={15} /> Potong &amp; Pakai</button>
                  <button type="button" onClick={checkWithAI} disabled={segmenting || reading} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm" title="Membagi area menjadi baris, lalu AI membaca tiap baris (draf, perlu diperiksa).">
                    <Icon name="smart_toy" size={16} />{segmenting ? "Membagi baris…" : reading ? "AI membaca… (±30 dtk)" : hasRect ? "Cek dengan AI" : "Cek seluruh gambar dengan AI"}
                  </button>
                  <button type="button" onClick={() => { setRect(null); setSuggestions([]); }} disabled={!rect && !suggestions.length} className="px-2 py-1.5 text-stone-500 hover:text-primary disabled:opacity-40">Hapus pilihan</button>
                </div>
              )}
              {fullImage && <p className="mt-2 text-xs text-center text-stone-500">Menampilkan potongan area. <button type="button" onClick={restoreFull} className="text-primary underline">Kembalikan gambar penuh</button></p>}
              <p className="mt-4 text-center text-xs text-stone-500 flex items-center justify-center gap-2"><Icon name="open_with" size={16} /> Geser kanvas untuk menelusuri lempir <span>•</span> <span className="font-mono">Kontras tinggi = Sauvola (pratinjau)</span></p>
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
                <button type="button" onClick={reset} className="text-stone-600 underline">Ganti foto</button>
                {enhancedImg && !loading && (
                  <button type="button" onClick={source === "enhanced" ? () => { setSource("asli"); image && analyze(image); } : reanalyzeEnhanced} className="text-primary underline">
                    {source === "enhanced" ? "Bantuan AI dengan gambar asli" : "Bantuan AI dengan versi Enhanced"}
                  </button>
                )}
              </div>
              {analysis && analysis.model !== "manual" && <p className="text-xs text-stone-400 text-center mt-2">Bantuan AI terakhir memakai gambar {source === "enhanced" ? "Enhanced" : "asli"}.</p>}
            </div>
            <div className="px-6 py-3.5 border-t border-stone-100 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-600">
              <span className="flex items-center gap-1.5"><Icon name="verified" size={16} className={dims && Math.max(dims.w, dims.h) >= 1200 ? "text-emerald-600" : "text-amber-600"} />
                <b className="text-stone-900">{dims && Math.max(dims.w, dims.h) >= 1200 ? "Resolusi Optimal untuk Transkripsi" : "Resolusi rendah: foto lebih dekat disarankan"}</b></span>
              <span>Kondisi Fisik: <b className="text-stone-900">{{ baik: "Baik (Utuh)", rapuh: "Rapuh", rusak_sebagian: "Rusak Sebagian", fragmentaris: "Fragmentaris" }[condition]}</b></span>
              <span className="text-stone-300">|</span>
              <span>Serat Lontar: <b className="text-stone-900">Tal (Borassus)</b></span>
            </div>
          </div>

          {/* Right: results */}
          <div className="min-w-0 bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-[0_2px_12px_rgba(24,24,27,0.03)]">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5 text-sm font-semibold text-stone-900 uppercase tracking-wide">
                <Icon name="auto_awesome" size={20} className="text-primary" /> Interpretasi &amp; Transliterasi
              </span>
              {analysis && (
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                  {(["id", "en"] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setLang(l)} className={`px-2.5 py-1 rounded-md text-xs ${lang === l ? "bg-white text-stone-900 font-semibold shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
                      {l === "id" ? "Bahasa ID" : "English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 space-y-6">
            {!analysis && !loading && !error && (
              <div className="space-y-3">
                <h2 className="font-serif text-xl font-medium text-stone-900">Bagaimana ingin memulai?</h2>
                <button type="button" onClick={() => { setAnalysis(emptyAnalysis()); }}
                  className="w-full text-left rounded-2xl border border-primary/40 bg-terra-50/40 p-4 hover:bg-terra-50 flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-primary flex items-center justify-center shrink-0"><Icon name="edit_note" size={22} /></span>
                  <span><b className="text-stone-900">Isi manual</b> <span className="text-xs text-stone-500">(disarankan, gratis)</span>
                  <span className="block text-sm text-stone-600">Ketik transliterasi Latin per baris; aksara Bali dibuat otomatis oleh aturan konversi dan dapat Anda ubah.</span></span>
                </button>
                <button type="button" onClick={() => image && analyze(image)}
                  className="w-full text-left rounded-2xl border border-stone-200 bg-white p-4 hover:bg-stone-50 flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0"><Icon name="smart_toy" size={22} /></span>
                  <span><b className="text-stone-900">Bantuan AI</b> <span className="text-xs text-stone-500">(opsional, berbayar per pemakaian)</span>
                  <span className="block text-sm text-stone-600">AI menebak jumlah baris, blok, dan rumpun naskah. AI belum dapat membaca aksara Bali dengan andal; transkripsi tetap perlu Anda isi.</span></span>
                </button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-10 h-10 border-4 border-terra-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-stone-600">Membaca naskah… (bisa sampai ±20 detik)</p>
              </div>
            )}

            {error && !loading && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3">
                <p className="text-red-700 text-sm">{error}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => image && analyze(image)} className="px-4 py-1.5 rounded-full bg-terra-600 text-white text-sm">Coba lagi</button>
                  <button type="button" onClick={() => { setAnalysis(emptyAnalysis()); setError(null); }} className="px-4 py-1.5 rounded-full bg-white border border-stone-300 text-sm">Isi manual</button>
                </div>
              </div>
            )}

            {analysis && !loading && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-amberink-100 border border-amberink-200 text-amberink-700 text-[11px] font-mono font-semibold">
                    {analysis.model === "manual" ? "Transkripsi manual" : edited ? "Dikoreksi manusia" : "Draf AI"}
                  </span>
                  {analysis.model !== "manual" && analysis.confidence_score > 0 && (
                    <span className={`text-xs ${band(analysis.confidence_score)[1]}`}>
                      Keyakinan (perkiraan): {band(analysis.confidence_score)[0]}
                    </span>
                  )}
                  <span className="text-xs text-stone-500">{CATEGORY_LABELS[analysis.category]}</span>
                </div>
                {Object.keys(aiLines).length > 0 && (
                  <p className="text-xs rounded-xl bg-amberink-50 border border-amberink-200 text-amberink-800 px-3 py-2.5 leading-relaxed">
                    <b>Draf AI per baris, belum terverifikasi.</b> Urutannya: pisahkan karakter, kenali satu per satu, rangkai kata dengan kamus awal, tulis aksara lalu Latin. Bagian yang tidak terbaca ditandai <code>[?]</code>. Konsistensi di bawah ±60% berarti bacaan besar kemungkinan keliru: periksa setiap baris terhadap potongan gambarnya, lalu perbaiki.
                  </p>
                )}
                {analysis.warnings.map((w, i) => (
                  <p key={i} className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">⚠ {w}</p>
                ))}

                {/* 1. Aksara */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-amberink-700 uppercase tracking-wide">1. Aksara Bali (Unicode)</h3>
                    <button type="button" onClick={() => copy("aksara", analysis.unicode_transcription)} disabled={!analysis.unicode_transcription}
                      className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-primary px-2 py-0.5 rounded-md hover:bg-stone-100 disabled:opacity-40">
                      <Icon name="content_copy" size={15} />{copied === "aksara" ? "Tersalin" : "Salin aksara"}
                    </button>
                  </div>
                  <div className="font-bali p-5 rounded-2xl bg-stone-50 border border-stone-200 text-3xl text-stone-900 leading-loose tracking-wide whitespace-pre-line min-h-[5rem] select-all">
                    {analysis.unicode_transcription.trim() || <span className="font-sans text-sm text-stone-400 tracking-normal">Aksara muncul otomatis saat Anda mengetik transliterasi Latin di bawah.</span>}
                  </div>
                </section>

                {/* 2. Latin */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide">2. Transliterasi Latin Fonetik <span className="normal-case font-normal text-stone-500 text-xs">(dapat disunting)</span></h3>
                    <div className="flex items-center gap-1" onMouseDown={(e) => e.preventDefault()}>
                      {["ā", "ī", "ū", "ĕ", "é", "ṭ", "ḍ", "ṇ", "ś", "ṣ"].map((ch) => (
                        <button key={ch} type="button" onClick={() => insertChar(ch)} className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-stone-100 text-stone-900 hover:bg-stone-200">{ch}</button>
                      ))}
                      <button type="button" onClick={() => setShowGuide(!showGuide)} className="ml-1 text-[11px] text-primary underline">{showGuide ? "Tutup" : "Panduan"}</button>
                    </div>
                  </div>
                  {showGuide && (
                    <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600 space-y-1">
                      <p><b>Vokal:</b> a ā i ī u ū · e/é (taleng) · ĕ (pepet) · o · ai · au</p>
                      <p><b>Konsonan:</b> k kh g gh ng c ch j jh ny ṭ ṭh ḍ ḍh ṇ t th d dh n p ph b bh m y r l w ś ṣ s h</p>
                      <p><b>Tanda:</b> koma (,) = carik · titik (.) atau | = pasalinan</p>
                      <p>Konsonan tanpa vokal di akhir suku: <b>ng</b>→cecek, <b>r</b>→surang, <b>h</b>→bisah; lainnya adeg-adeg. Konsonan beruntun membentuk gantungan. Hasil adalah pratinjau aturan konversi, bukan pengganti pemeriksaan pembaca aksara.</p>
                    </div>
                  )}
                  {analysis.lines.map((l, i) => (
                    <div key={i} onFocus={() => setActiveLine(i)}
                      className={`rounded-2xl border p-3 space-y-1.5 ${activeLine === i ? "border-stone-300 bg-amberink-50" : "border-stone-200"}`}>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span className="font-mono">Baris {l.index}{aiLines[i] !== undefined && <span className="ml-2 px-1.5 py-0.5 rounded bg-amberink-100 text-amberink-700 normal-case">AI draf · konsistensi {Math.round(aiLines[i] * 100)}%</span>}</span>
                        <span className="flex items-center gap-2">
                          {analysis.model !== "manual" && l.confidence > 0 && <span className={band(l.confidence)[1]}>{band(l.confidence)[0]}</span>}
                          <select value={l.block} onChange={(e) => commitLines(analysis.lines.map((x, k) => (k === i ? { ...x, block: e.target.value as Line["block"] } : x)))}
                            className="border border-stone-200 rounded px-1 py-0.5 bg-white" aria-label="Blok">
                            <option value="penuh">penuh</option><option value="kiri">kiri</option><option value="kanan">kanan</option>
                          </select>
                          <button type="button" onClick={() => removeLine(i)} className="text-stone-400 hover:text-primary" aria-label={`Hapus baris ${l.index}`}>hapus</button>
                        </span>
                      </div>
                      {lineThumbs[i] && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={lineThumbs[i]} alt={`Potongan baris ${l.index}`} className="w-full max-h-16 object-contain rounded-lg bg-stone-900 border border-stone-200" />
                      )}
                      {lineGlyphs[i] && (
                        <details className="rounded-xl border border-stone-200 bg-white">
                          <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-stone-500">Karakter per karakter ({lineGlyphs[i].thumbs.length}) · dikenali satu per satu</summary>
                          <div className="px-3 pb-3 overflow-x-auto">
                            <div className="flex gap-1.5 min-w-max">
                              {lineGlyphs[i].thumbs.map((th, c) => {
                                const cand = lineGlyphs[i].cands[c] ?? [];
                                const top = cand[0]?.cand ?? "?";
                                const tk = lineGlyphs[i].tokens.find((t) => c >= t.from && c < t.to);
                                const fixed = tk?.kind === "kamus";
                                return (
                                  <div key={c} className={`w-[72px] shrink-0 rounded-lg border p-1 text-center ${fixed ? "border-emerald-300 bg-emerald-50/50" : "border-stone-200"}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={th} alt="" className="w-full h-12 object-contain bg-white rounded" />
                                    <div className="font-bali text-lg leading-tight text-stone-900">{/^[?-]$/.test(top) ? "·" : latinToBali(top)}</div>
                                    <div className="text-[10px] font-mono text-stone-600">{top}</div>
                                    {cand.length > 1 && <div className="text-[9px] text-stone-400 truncate">{cand.slice(1).map((x) => x.cand).join(" / ")}</div>}
                                  </div>
                                );
                              })}
                            </div>
                            <p className="mt-2 text-[11px] text-stone-500">Hijau = bagian yang dirangkai dengan bantuan kamus awal ({lineGlyphs[i].tokens.filter((t) => t.kind === "kamus").map((t) => t.text + (t.changed ? "*" : "")).join(", ") || "tidak ada"}); * = bacaan dikoreksi kamus. Kamus awal bukan kamus resmi dan perlu ditinjau ahli.</p>
                          </div>
                        </details>
                      )}
                      {/* 1. Aksara Bali Unicode (otomatis dari Latin, dapat disunting) */}
                      <div className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2">
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-0.5">
                          <span>Aksara Bali</span>
                          {manualUnicode.has(i) && <button type="button" className="normal-case text-primary hover:underline" onClick={() => { const nm = new Set(manualUnicode); nm.delete(i); setManualUnicode(nm); changeLatin(i, l.latin); }}>kembalikan otomatis</button>}
                        </div>
                        <textarea rows={1} value={l.unicode} placeholder="Aksara muncul otomatis dari Latin di bawah"
                          onChange={(e) => changeUnicode(i, e.target.value)}
                          className="font-bali w-full bg-transparent text-2xl leading-loose text-stone-900 resize-y focus:outline-none placeholder:font-sans placeholder:text-sm placeholder:text-stone-400" />
                      </div>
                      {/* 2. Latin */}
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-0.5">Latin</div>
                        <textarea rows={1} data-latin={i} value={l.latin} placeholder="mis. ong awighnamastu"
                          onChange={(e) => changeLatin(i, e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-serif italic text-base text-stone-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y placeholder:text-stone-400 placeholder:not-italic" />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addLine} className="text-xs text-primary underline">+ Tambah baris</button>
                </section>

                {/* 3. Terjemahan */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide">3. Terjemahan Makna</h3>
                    <button type="button" onClick={() => copy("teks", `${analysis.latin_transliteration}\n\n${lang === "id" ? analysis.translation.indonesian : analysis.translation.english}`)}
                      className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-primary px-2 py-0.5 rounded-md hover:bg-stone-100">
                      <Icon name="content_copy" size={15} />{copied === "teks" ? "Tersalin" : "Salin teks"}
                    </button>
                  </div>
                  <textarea rows={4} value={lang === "id" ? analysis.translation.indonesian : analysis.translation.english}
                    placeholder={lang === "id" ? "Terjemahan Bahasa Indonesia…" : "English translation…"}
                    onChange={(e) => { setAnalysis({ ...analysis, translation: { ...analysis.translation, [lang === "id" ? "indonesian" : "english"]: e.target.value } }); setEdited(true); }}
                    className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </section>

                {analysis.philosophical_context && (
                  <div className="p-5 rounded-2xl bg-amberink-50 border border-amberink-200 space-y-2">
                    <div className="flex items-center gap-2 text-amberink-700 text-sm font-semibold uppercase tracking-wide"><Icon name="local_library" size={20} /> Makna Filosofis (tafsiran AI)</div>
                    <p className="font-serif italic text-sm text-amber-950 leading-relaxed">{analysis.philosophical_context}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  <button type="button" className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-900 font-medium hover:bg-stone-50 flex items-center gap-1.5"
                    onClick={() => downloadJson(`lontarai-${Date.now()}.json`, buildExport(
                      { title, owner, regency, village_banjar: banjar, era, source: "LontarAI Studio" }, analysis, edited))}>
                    <Icon name="download" size={15} /> Unduh JSON
                  </button>
                  <button type="button" className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-900 font-medium hover:bg-stone-50 flex items-center gap-1.5" onClick={() => window.print()}>
                    <Icon name="print" size={15} /> Cetak / Simpan PDF
                  </button>
                </div>
                <p className="text-xs text-stone-500">
                  {analysis.model === "manual"
                    ? "Aksara Bali dibuat dari ejaan Latin Anda memakai aturan konversi dan dapat keliru pada kasus khusus (mis. gantungan atau pepet). Periksa bersama pembaca aksara sebelum dipakai sebagai rujukan."
                    : "Hasil AI adalah draf dan dapat keliru, terutama pada aksara pudar. Bagian bertanda [?] tidak terbaca. Periksa bersama pembaca aksara sebelum dipakai sebagai rujukan."}
                </p>
              </>
            )}
            </div>
          </div>
        </div>
      )}

      {analysis && image && (
        <PrintCertificate image={image} analysis={analysis} edited={edited}
          meta={{ title, owner, regency, village_banjar: banjar, era }} />
      )}

      {/* Detail panel */}
      {analysis && !loading && (
        <section id="detail-simpan" className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 space-y-5">
          <h2 className="font-serif text-xl font-medium text-stone-900 flex items-center gap-2"><Icon name="inventory_2" size={22} className="text-primary" /> Detail Naskah &amp; Penyimpanan</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Judul naskah *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} /></Field>
            <Field label="Pemilik / pengempu *"><input value={owner} onChange={(e) => setOwner(e.target.value)} className={inp} /></Field>
            <Field label="Afiliasi">
              <select value={affiliation} onChange={(e) => setAffiliation(e.target.value)} className={inp}>
                {AFFILIATIONS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Kondisi fisik">
              <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className={inp}>
                <option value="baik">Baik (utuh)</option><option value="rapuh">Rapuh</option><option value="rusak_sebagian">Rusak sebagian</option><option value="fragmentaris">Fragmentaris</option>
              </select>
            </Field>
            <Field label="Perkiraan era"><input value={era} onChange={(e) => setEra(e.target.value)} placeholder="mis. abad ke-19" className={inp} /></Field>
            <Field label="Kabupaten/Kota *">
              <select value={regency} onChange={(e) => setRegency(e.target.value)} className={inp}>
                {REGENCIES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Desa / Banjar *"><input value={banjar} onChange={(e) => setBanjar(e.target.value)} className={inp} /></Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">Lokasi naskah *</span>
              <button type="button" onClick={useMyLocation} className="text-sm text-terra-700 underline"><Icon name="my_location" size={15} className="inline mr-1" />Gunakan lokasi saya</button>
            </div>
            <MapPicker lat={lat} lng={lng} onPick={(a, b) => { setLat(a); setLng(b); }} />
            <p className="text-xs text-stone-500">
              {lat != null ? `Titik dipilih: ${lat.toFixed(4)}, ${lng?.toFixed(4)}. ` : "Klik peta untuk memilih titik. "}
              Titik tepat hanya terlihat oleh Anda; di arsip publik lokasi dibulatkan ke area ±1 km.
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-stone-700 mb-1">Siapa yang boleh melihat?</legend>
            <label className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${visibility === "private" ? "border-terra-500 bg-amber-50" : "border-stone-200"}`}>
              <input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} />
              <span><b>Private Vault</b> <span className="text-sm text-stone-600">— hanya Anda. Pilihan awal dan paling aman.</span></span>
            </label>
            <label className={`flex gap-3 rounded-xl border p-3 ${pingit ? "opacity-50" : "cursor-pointer"} ${visibility === "public" ? "border-terra-500 bg-amber-50" : "border-stone-200"}`}>
              <input type="radio" disabled={pingit} checked={visibility === "public"} onChange={() => setVisibility("public")} />
              <span><b>Arsip Publik</b> <span className="text-sm text-stone-600">— gambar, transliterasi, dan terjemahan dapat dilihat siapa saja; lokasi hanya berupa area.</span></span>
            </label>
            <label className="flex gap-3 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={pingit} onChange={(e) => { setPingit(e.target.checked); if (e.target.checked) { setVisibility("private"); setConsent(false); } }} />
              <span>Naskah ini <b>pingit/sakral</b>. Tidak akan pernah tampil di arsip atau peta publik.</span>
            </label>
            {visibility === "public" && (
              <div className="rounded-xl bg-stone-50 p-3 space-y-2 text-sm text-stone-700">
                <label className="flex gap-3 cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>Saya berhak atas naskah ini, naskah bukan pingit menurut dresta setempat, dan saya setuju gambar serta teksnya dipublikasikan. Saya dapat mencabutnya kapan saja.</span>
                </label>
                <label className="flex gap-3 cursor-pointer">
                  <input type="checkbox" checked={showOwner} onChange={(e) => setShowOwner(e.target.checked)} />
                  <span>Tampilkan nama pemilik di arsip (opsional).</span>
                </label>
              </div>
            )}
          </fieldset>

          {lineRects.length > 0 && (
            <label className={`flex gap-3 rounded-2xl border p-4 text-sm ${pingit ? "opacity-50" : "cursor-pointer"} ${shareTraining ? "border-primary bg-terra-50/40" : "border-stone-200"}`}>
              <input type="checkbox" disabled={pingit} checked={shareTraining && !pingit} onChange={(e) => setShareTraining(e.target.checked)} />
              <span className="text-stone-700">
                <b className="text-stone-900">Sumbangkan data latih OCR aksara Bali</b> (sukarela). Potongan gambar baris dan transliterasi yang sudah Anda periksa ({eligibleLines().length} baris memenuhi syarat) dipakai melatih model pengenal aksara Bali.
                <span className="block text-xs text-stone-500 mt-1">Hanya baris yang Anda ketik atau koreksi sendiri; draf AI yang tidak diubah tidak ikut. Tidak berlaku untuk naskah pingit. Bagian lain naskah tetap mengikuti pilihan privat/publik Anda. Dapat ditarik kapan saja di Vault.</span>
              </span>
            </label>
          )}
          <AuthPanel />
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </section>
      )}

      {/* Bottom action bar */}
      {analysis && !loading && (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
            <button type="button" onClick={() => setVisibility(visibility === "private" ? (pingit ? "private" : "public") : "private")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 border border-stone-200">
              <Icon name={visibility === "private" ? "lock" : "public"} size={18} className="text-primary" />
              Penyimpanan: <b className="text-primary">{visibility === "private" ? "Private Vault (Hanya Saya)" : "Arsip Publik"}</b>
            </button>
            <span className="text-xs text-stone-500">• Ubah di panel detail</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => copy("teks", `${analysis.latin_transliteration}\n\n${lang === "id" ? analysis.translation.indonesian : analysis.translation.english}`)}
              className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-sm font-medium flex items-center gap-2 hover:bg-stone-50"><Icon name="content_copy" size={18} />{copied === "teks" ? "Tersalin" : "Salin Teks"}</button>
            <button type="button" onClick={() => { if (!canSave || !session) { document.getElementById("detail-simpan")?.scrollIntoView({ behavior: "smooth" }); return; } save(); }} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-stone-300 text-white text-sm font-semibold flex items-center gap-2">
              <Icon name="bookmark" size={18} />{saving ? "Menyimpan…" : visibility === "public" ? "Simpan & Publikasikan" : "Simpan ke Vault"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1">{label}</span>{children}</label>;
}
