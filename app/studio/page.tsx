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
    { id: "krakah", label: "Sampel 1: Krakah (Lempir)", file: "/samples/krakah-sanggaraha.webp", title: "Krakah Sanggaraha" },
    { id: "taru", label: "Sampel 2: Usada (Pengobatan)", file: "/samples/taru-pramana.jpg", title: "Usada Taru Pramana" },
    { id: "babad", label: "Sampel 3: Babad (Sejarah)", file: "/samples/babad-klungkung.jpg", title: "Babad Dalem Klungkung" },
    { id: "wariga", label: "Sampel 4: Wariga (Astronomi)", file: "/samples/wariga-gemet.jpg", title: "Wariga Gemet Pawukon" },
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

  const reset = () => {
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
          estimated_creation_era: era || undefined,
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
      else setSaved({ visibility });
    } catch {
      setSaveError("Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-3">{saved.visibility === "public" ? "🌏" : "🔒"}</div>
        <h1 className="text-2xl font-bold text-terra-700 mb-2">Naskah tersimpan</h1>
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
        <div className="rounded-2xl border-2 border-dashed border-terra-300 bg-white p-10 text-center space-y-4">
          <p className="text-stone-700">Unggah foto satu lempir lontar (JPG, PNG, atau WebP).</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <label className="px-5 py-2.5 rounded-full bg-terra-600 text-white font-semibold cursor-pointer hover:bg-terra-700">
              📷 Pilih / Ambil Foto
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
          <div className="min-w-0 bg-white rounded-2xl border border-stone-200 overflow-hidden self-start shadow-[0_2px_12px_rgba(24,24,27,0.03)]">
            <div className="px-5 py-3.5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amberink-700" />{title.trim() ? `Lempir: ${title}` : "Citra naskah"}
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                  <button type="button" onClick={() => toggleEnhanced(false)} className={`px-2.5 py-1 rounded-md text-xs ${!enhanced ? "bg-white text-primary font-semibold shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>Asli</button>
                  <button type="button" onClick={() => toggleEnhanced(true)} className={`px-2.5 py-1 rounded-md text-xs ${enhanced ? "bg-white text-primary font-semibold shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
                    {enhancing ? "Memproses…" : "Kontras tinggi"}
                  </button>
                </div>
                <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                  <button type="button" aria-label="Perkecil" onClick={() => setZoom(Math.max(100, zoom - 25))} className="p-1 rounded-md text-stone-500 hover:text-stone-900"><Icon name="zoom_out" size={16} /></button>
                  <span className="text-xs font-mono text-stone-700 w-10 text-center">{zoom}%</span>
                  <button type="button" aria-label="Perbesar" onClick={() => setZoom(Math.min(500, zoom + 25))} className="p-1 rounded-md text-stone-500 hover:text-stone-900"><Icon name="zoom_in" size={16} /></button>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
            <div className="overflow-auto max-h-[70vh] rounded-xl border border-stone-200 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enhanced && enhancedImg ? enhancedImg : image} alt="Foto lempir lontar" className="max-w-none h-auto"
                style={{ width: `${zoom}%` }} />
            </div>
            <p className="text-xs text-stone-500 text-center">Perbesar lalu geser untuk membaca per baris. Kontras tinggi = binarisasi adaptif Sauvola (pratinjau); berkas asli tetap yang disimpan.</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <button type="button" onClick={reset} className="text-stone-600 underline">Ganti foto</button>
              {enhancedImg && !loading && (
                <button type="button" onClick={source === "enhanced" ? () => { setSource("asli"); image && analyze(image); } : reanalyzeEnhanced} className="text-terra-700 underline">
                  {source === "enhanced" ? "Bantuan AI dengan gambar asli" : "Bantuan AI dengan versi Enhanced"}
                </button>
              )}
            </div>
            {analysis && analysis.model !== "manual" && <p className="text-xs text-stone-400">Bantuan AI terakhir memakai gambar {source === "enhanced" ? "Enhanced" : "asli"}.</p>}
            </div>
          </div>

          {/* Right: results */}
          <div className="min-w-0 bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_2px_12px_rgba(24,24,27,0.03)]">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-stone-900 uppercase tracking-wider">
                <Icon name="auto_awesome" size={18} className="text-primary" /> Transkripsi &amp; transliterasi
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
            <div className="p-5 space-y-5">
            {!analysis && !loading && !error && (
              <div className="rounded-2xl border border-terra-200 bg-amber-50/50 p-5 space-y-3">
                <h2 className="font-serif text-lg font-semibold text-stone-900">Bagaimana ingin memulai?</h2>
                <button type="button" onClick={() => { setAnalysis(emptyAnalysis()); }}
                  className="w-full text-left rounded-xl border border-terra-400 bg-white p-3 hover:bg-amber-50">
                  <b>✍ Isi manual</b> <span className="text-xs text-stone-500">(disarankan, gratis)</span>
                  <p className="text-sm text-stone-600">Ketik transliterasi Latin per baris; aksara Bali dibuat otomatis oleh aturan konversi dan dapat Anda ubah.</p>
                </button>
                <button type="button" onClick={() => image && analyze(image)}
                  className="w-full text-left rounded-xl border border-stone-300 bg-white p-3 hover:bg-stone-50">
                  <b>🤖 Bantuan AI</b> <span className="text-xs text-stone-500">(opsional, berbayar per pemakaian)</span>
                  <p className="text-sm text-stone-600">AI menebak jumlah baris, blok, dan rumpun naskah. AI belum dapat membaca aksara Bali dengan andal; transkripsi tetap perlu Anda isi.</p>
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
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                    {analysis.model === "manual" ? "Transkripsi manual" : edited ? "Dikoreksi manusia" : "Draf AI"}
                  </span>
                  {analysis.model !== "manual" && analysis.confidence_score > 0 && (
                    <span className={`text-xs ${band(analysis.confidence_score)[1]}`}>
                      Keyakinan (perkiraan): {band(analysis.confidence_score)[0]}
                    </span>
                  )}
                  <span className="text-xs text-stone-500">{CATEGORY_LABELS[analysis.category]}</span>
                </div>
                {analysis.warnings.map((w, i) => (
                  <p key={i} className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">⚠ {w}</p>
                ))}

                {/* 1. Aksara */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-amberink-700 uppercase tracking-wider">1. Aksara Bali (Unicode)</h3>
                    <button type="button" onClick={() => copy("aksara", analysis.unicode_transcription)} disabled={!analysis.unicode_transcription}
                      className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-primary px-2 py-0.5 rounded-md hover:bg-stone-100 disabled:opacity-40">
                      <Icon name="content_copy" size={15} />{copied === "aksara" ? "Tersalin" : "Salin aksara"}
                    </button>
                  </div>
                  <div className="font-bali p-4 rounded-xl bg-stone-50 border border-stone-200 text-2xl text-stone-900 leading-loose tracking-wide whitespace-pre-line min-h-[5rem] select-all">
                    {analysis.unicode_transcription.trim() || <span className="font-sans text-sm text-stone-400 tracking-normal">Aksara muncul otomatis saat Anda mengetik transliterasi Latin di bawah.</span>}
                  </div>
                </section>

                {/* 2. Latin */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">2. Transliterasi Latin <span className="normal-case font-normal text-stone-500">(dapat disunting)</span></h3>
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
                      className={`rounded-xl border p-2.5 space-y-1.5 ${activeLine === i ? "border-stone-300 bg-amberink-50" : "border-stone-200"}`}>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span className="font-mono">Baris {l.index}</span>
                        <span className="flex items-center gap-2">
                          {analysis.model !== "manual" && l.confidence > 0 && <span className={band(l.confidence)[1]}>{band(l.confidence)[0]}</span>}
                          <select value={l.block} onChange={(e) => commitLines(analysis.lines.map((x, k) => (k === i ? { ...x, block: e.target.value as Line["block"] } : x)))}
                            className="border border-stone-200 rounded px-1 py-0.5 bg-white" aria-label="Blok">
                            <option value="penuh">penuh</option><option value="kiri">kiri</option><option value="kanan">kanan</option>
                          </select>
                          <button type="button" onClick={() => removeLine(i)} className="text-stone-400 hover:text-primary" aria-label={`Hapus baris ${l.index}`}>hapus</button>
                        </span>
                      </div>
                      <textarea rows={1} data-latin={i} value={l.latin} placeholder="mis. ong awighnamastu"
                        onChange={(e) => changeLatin(i, e.target.value)}
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-serif italic text-base text-stone-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y placeholder:text-stone-400 placeholder:not-italic" />
                      <details className="text-[11px] text-stone-500">
                        <summary className="cursor-pointer hover:text-stone-800">Sunting aksara baris ini</summary>
                        <textarea rows={1} value={l.unicode} placeholder="Aksara Bali (otomatis dari Latin)"
                          onChange={(e) => changeUnicode(i, e.target.value)}
                          className="font-bali mt-1 w-full rounded-lg border border-stone-200 px-2 py-1 text-lg resize-y bg-stone-50" />
                      </details>
                    </div>
                  ))}
                  <button type="button" onClick={addLine} className="text-xs text-primary underline">+ Tambah baris</button>
                </section>

                {/* 3. Terjemahan */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">3. Terjemahan makna</h3>
                    <button type="button" onClick={() => copy("teks", `${analysis.latin_transliteration}\n\n${lang === "id" ? analysis.translation.indonesian : analysis.translation.english}`)}
                      className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-primary px-2 py-0.5 rounded-md hover:bg-stone-100">
                      <Icon name="content_copy" size={15} />{copied === "teks" ? "Tersalin" : "Salin teks"}
                    </button>
                  </div>
                  <textarea rows={4} value={lang === "id" ? analysis.translation.indonesian : analysis.translation.english}
                    placeholder={lang === "id" ? "Terjemahan Bahasa Indonesia…" : "English translation…"}
                    onChange={(e) => { setAnalysis({ ...analysis, translation: { ...analysis.translation, [lang === "id" ? "indonesian" : "english"]: e.target.value } }); setEdited(true); }}
                    className="w-full rounded-xl border border-stone-200 bg-white p-3.5 text-sm text-stone-900 leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </section>

                {analysis.philosophical_context && (
                  <div className="p-4 rounded-xl bg-amberink-50 border border-amberink-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-amberink-700 text-xs font-semibold uppercase tracking-wider"><Icon name="menu_book" size={18} /> Konteks (tafsiran AI)</div>
                    <p className="font-serif italic text-sm text-amber-950 leading-relaxed">{analysis.philosophical_context}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  <button type="button" className="px-3.5 py-2 rounded-lg bg-white border border-stone-200 text-stone-900 font-medium hover:bg-stone-50 hover:border-stone-300"
                    onClick={() => downloadJson(`lontarai-${Date.now()}.json`, buildExport(
                      { title, owner, regency, village_banjar: banjar, era, source: "LontarAI Studio" }, analysis, edited))}>
                    ⬇ Unduh JSON
                  </button>
                  <button type="button" className="px-3.5 py-2 rounded-lg bg-white border border-stone-200 text-stone-900 font-medium hover:bg-stone-50 hover:border-stone-300" onClick={() => window.print()}>
                    🖨 Cetak / Simpan PDF
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

      {/* Save panel */}
      {analysis && !loading && (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 space-y-5">
          <h2 className="text-lg font-semibold text-terra-800">Simpan naskah</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Judul naskah *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} /></Field>
            <Field label="Pemilik / pengempu *"><input value={owner} onChange={(e) => setOwner(e.target.value)} className={inp} /></Field>
            <Field label="Afiliasi">
              <select value={affiliation} onChange={(e) => setAffiliation(e.target.value)} className={inp}>
                {AFFILIATIONS.map((a) => <option key={a}>{a}</option>)}
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
              <button type="button" onClick={useMyLocation} className="text-sm text-terra-700 underline">📍 Gunakan lokasi saya</button>
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
              <span><b>🔒 Private Vault</b> <span className="text-sm text-stone-600">— hanya Anda. Pilihan awal dan paling aman.</span></span>
            </label>
            <label className={`flex gap-3 rounded-xl border p-3 ${pingit ? "opacity-50" : "cursor-pointer"} ${visibility === "public" ? "border-terra-500 bg-amber-50" : "border-stone-200"}`}>
              <input type="radio" disabled={pingit} checked={visibility === "public"} onChange={() => setVisibility("public")} />
              <span><b>🌏 Arsip Publik</b> <span className="text-sm text-stone-600">— gambar, transliterasi, dan terjemahan dapat dilihat siapa saja; lokasi hanya berupa area.</span></span>
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

          <AuthPanel />
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <button type="button" onClick={save} disabled={!canSave || !session || saving}
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-terra-600 text-white font-semibold hover:bg-terra-700 disabled:bg-stone-300 disabled:cursor-not-allowed">
            {saving ? "Menyimpan…" : visibility === "public" ? "Simpan & Publikasikan" : "Simpan ke Vault"}
          </button>
        </section>
      )}
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded-lg border border-stone-300 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1">{label}</span>{children}</label>;
}
