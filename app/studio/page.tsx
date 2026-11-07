"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { resizeToJpeg } from "@/lib/image";
import { enhanceImage } from "@/lib/cv";
import { buildExport, downloadJson } from "@/lib/export";
import PrintCertificate from "@/components/PrintCertificate";
import { AFFILIATIONS, CATEGORY_LABELS, REGENCIES } from "@/lib/regencies";
import type { AnalysisResult } from "@/lib/ai/schema";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-60 rounded-xl bg-stone-100" />,
});

type Line = AnalysisResult["lines"][number];

const emptyAnalysis = (): AnalysisResult => ({
  category: "lainnya",
  lines: [{ index: 1, block: "penuh", unicode: "", latin: "", confidence: 0 }],
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
  const [tab, setTab] = useState<"latin" | "bali" | "terjemahan">("latin");
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
      analyze(img);
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

  const loadSample = async () => {
    const res = await fetch("/samples/krakah-sanggaraha.webp");
    load(await res.blob());
  };

  const reset = () => {
    setImage(null); setAnalysis(null); setError(null); setSaved(null); setEdited(false);
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-terra-800">Studio Transkripsi</h1>
      <p className="text-stone-600 text-sm mt-1 mb-6">
        Foto lempir lontar → draf transkripsi AI → koreksi Anda → simpan privat atau bagikan ke arsip publik.
      </p>

      {!image && (
        <div className="rounded-2xl border-2 border-dashed border-terra-300 bg-amber-50/50 p-8 text-center space-y-4">
          <p className="text-stone-700">Unggah foto satu lempir lontar (JPG, PNG, atau WebP).</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <label className="px-5 py-2.5 rounded-full bg-terra-600 text-white font-semibold cursor-pointer hover:bg-terra-700">
              📷 Pilih / Ambil Foto
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={loadSample} className="px-5 py-2.5 rounded-full bg-white border border-terra-300 text-terra-800 font-medium hover:bg-amber-50">
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
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">Gambar</h2>
              <label className="text-sm text-stone-600 flex items-center gap-2">
                <input type="checkbox" checked={enhanced} onChange={(e) => toggleEnhanced(e.target.checked)} />
                {enhancing ? "Memproses…" : "Enhanced (Sauvola)"}
              </label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enhanced && enhancedImg ? enhancedImg : image} alt="Foto lempir lontar" className="max-w-none h-auto min-w-full"
                style={{ minWidth: 700 }} />
            </div>
            <p className="text-xs text-stone-500">Geser ke samping untuk melihat seluruh lempir. Enhanced = binarisasi adaptif Sauvola (pratinjau); berkas asli tetap yang disimpan.</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <button type="button" onClick={reset} className="text-stone-600 underline">Ganti foto</button>
              {enhancedImg && !loading && (
                <button type="button" onClick={source === "enhanced" ? () => { setSource("asli"); image && analyze(image); } : reanalyzeEnhanced} className="text-terra-700 underline">
                  {source === "enhanced" ? "Analisis ulang dengan gambar asli" : "Analisis ulang dengan versi Enhanced"}
                </button>
              )}
            </div>
            {analysis && <p className="text-xs text-stone-400">Analisis terakhir memakai gambar {source === "enhanced" ? "Enhanced" : "asli"}.</p>}
          </div>

          {/* Right: results */}
          <div className="space-y-4 min-w-0">
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
                    {edited ? "Dikoreksi manusia" : "Draf AI"}
                  </span>
                  <span className={`text-xs ${band(analysis.confidence_score)[1]}`}>
                    Keyakinan (perkiraan): {band(analysis.confidence_score)[0]}
                  </span>
                  <span className="text-xs text-stone-500">{CATEGORY_LABELS[analysis.category]}</span>
                </div>
                {analysis.warnings.map((w, i) => (
                  <p key={i} className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">⚠ {w}</p>
                ))}

                <div className="flex gap-1 border-b border-stone-200">
                  {([["latin", "Transliterasi"], ["bali", "Aksara Bali"], ["terjemahan", "Terjemahan & Konteks"]] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setTab(id)}
                      className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === id ? "border-terra-600 text-terra-800 font-semibold" : "border-transparent text-stone-500"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {tab !== "terjemahan" ? (
                  <div className="space-y-2">
                    {analysis.lines.map((l, i) => (
                      <div key={i} onFocus={() => setActiveLine(i)}
                        className={`rounded-lg border p-2 ${activeLine === i ? "border-terra-400 bg-amber-50/50" : "border-stone-200"}`}>
                        <div className="flex justify-between text-xs text-stone-500 mb-1">
                          <span>Baris {l.index}{l.block !== "penuh" ? ` · blok ${l.block}` : ""}</span>
                          <span className={band(l.confidence)[1]}>{band(l.confidence)[0]}</span>
                        </div>
                        <textarea rows={2} value={tab === "latin" ? l.latin : l.unicode}
                          onChange={(e) => updateLine(i, tab === "latin" ? { latin: e.target.value } : { unicode: e.target.value })}
                          className={`w-full rounded border border-stone-200 px-2 py-1 text-sm resize-y ${l.confidence < 0.45 ? "bg-amber-50" : ""}`} />
                      </div>
                    ))}
                    {analysis.lines.length === 0 && (
                      <button type="button" onClick={() => setAnalysis(emptyAnalysis())} className="text-sm text-terra-700 underline">Tambah baris manual</button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <h3 className="font-semibold text-stone-800">Bahasa Indonesia</h3>
                      <textarea rows={4} value={analysis.translation.indonesian}
                        onChange={(e) => { setAnalysis({ ...analysis, translation: { ...analysis.translation, indonesian: e.target.value } }); setEdited(true); }}
                        className="w-full rounded border border-stone-200 px-2 py-1" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-800">English</h3>
                      <textarea rows={4} value={analysis.translation.english}
                        onChange={(e) => { setAnalysis({ ...analysis, translation: { ...analysis.translation, english: e.target.value } }); setEdited(true); }}
                        className="w-full rounded border border-stone-200 px-2 py-1" />
                    </div>
                    {analysis.philosophical_context && (
                      <div className="rounded-lg bg-stone-50 p-3">
                        <h3 className="font-semibold text-stone-800">Konteks (tafsiran AI)</h3>
                        <p className="text-stone-600">{analysis.philosophical_context}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" className="px-4 py-1.5 rounded-full border border-terra-300 text-terra-800 hover:bg-terra-50"
                    onClick={() => downloadJson(`lontarai-${Date.now()}.json`, buildExport(
                      { title, owner, regency, village_banjar: banjar, era, source: "LontarAI Studio" }, analysis, edited))}>
                    ⬇ Unduh JSON
                  </button>
                  <button type="button" className="px-4 py-1.5 rounded-full border border-terra-300 text-terra-800 hover:bg-terra-50" onClick={() => window.print()}>
                    🖨 Cetak / Simpan PDF
                  </button>
                </div>
                <p className="text-xs text-stone-500">
                  Hasil AI adalah draf dan dapat keliru, terutama pada aksara pudar. Bagian bertanda [?] tidak terbaca. Periksa bersama pembaca aksara sebelum dipakai sebagai rujukan.
                </p>
              </>
            )}
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
