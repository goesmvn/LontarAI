import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import type { ClassificationResult } from "@/types/waste";
import { clientIp, rateLimit, validateImageDataUrl } from "@/lib/validation";

const VALID_CATEGORIES = [
  "organik",
  "plastik",
  "kertas",
  "logam_kaca",
  "b3",
  "residu",
  "none",
];

const SYSTEM_PROMPT = `Anda adalah asisten pengelolaan sampah untuk masyarakat Bali, Indonesia.
Bali menganut filosofi Tri Hita Karana (keseimbangan antara manusia, Tuhan, dan alam) serta Sad Kerthi (memuliakan alam: Segara Kerthi untuk laut, Danu Kerthi untuk sumber air, Wana Kerthi untuk tumbuhan, Jagat Kerthi untuk alam semesta). Pengelolaan sampah yang baik adalah bagian dari menjaga kesucian dan kelestarian alam Bali.
Tugas: analisis gambar sampah dan klasifikasikan ke dalam salah satu kategori:
1. organik - sisa makanan, dedaunan, bahan biodegradable
2. plastik - botol, kantong, kemasan plastik
3. kertas - kertas, kardus, karton
4. logam_kaca - kaleng, botol kaca, logam
5. b3 - baterai, bahan kimia, elektronik (Bahan Berbahaya dan Beracun)
6. residu - sampah yang tidak bisa didaur ulang
Respons HARUS dalam format JSON (Bahasa Indonesia):
{"category":"<id kategori>","categoryName":"<nama lengkap>","itemName":"<nama item>","recyclable":<true/false>,"disposalInstructions":"<cara pembuangan untuk konteks Bali, sebutkan bank sampah/TPS/TPA/tempat khusus sesuai kategori>","ecoTip":"<tips ramah lingkungan yang relevan dengan konteks Bali, kaitkan dengan menjaga kebersihan pantai/sungai/tempat suci jika relevan>","confidence":"<high/medium/low>"}
Jika tidak ada sampah terdeteksi: {"category":"none","categoryName":"Tidak Terdeteksi","itemName":"Tidak ada sampah terdeteksi","recyclable":false,"disposalInstructions":"Pastikan foto menunjukkan item sampah dengan jelas.","ecoTip":"","confidence":"low"}`;

export async function POST(request: NextRequest) {
  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Konfigurasi AI belum lengkap." },
      { status: 500 }
    );
  }

  let body: { image?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 }
    );
  }

  if (!rateLimit(`classify:${clientIp(request.headers)}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
      { status: 429 }
    );
  }

  const { image } = body;
  const imageError = validateImageDataUrl(image);

  if (imageError || !image) {
    return NextResponse.json(
      { error: imageError ?? "Gambar tidak ditemukan." },
      { status: 400 }
    );
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Klasifikasikan sampah pada gambar ini.",
            },
            {
              type: "image_url",
              image_url: { url: image },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Gagal menganalisis gambar. Silakan coba lagi." },
        { status: 500 }
      );
    }

    let parsed: ClassificationResult;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Gagal menganalisis gambar. Silakan coba lagi." },
        { status: 500 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(parsed.category)) {
      return NextResponse.json(
        { error: "Gagal menganalisis gambar. Silakan coba lagi." },
        { status: 500 }
      );
    }

    const data: ClassificationResult = {
      category: parsed.category,
      categoryName: String(parsed.categoryName ?? ""),
      itemName: String(parsed.itemName ?? ""),
      recyclable: Boolean(parsed.recyclable),
      disposalInstructions: String(parsed.disposalInstructions ?? ""),
      ecoTip: String(parsed.ecoTip ?? ""),
      confidence: ["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : "low",
    };

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { error: "Gagal menganalisis gambar. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
