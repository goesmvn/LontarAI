import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { WasteReport } from "@/types/waste";
import {
  MAX_DESCRIPTION_LENGTH,
  clientIp,
  rateLimit,
  validateBaliCoordinates,
  validateImageDataUrl,
} from "@/lib/validation";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("waste_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Gagal memuat laporan." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: data as WasteReport[] });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat laporan." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: {
    lat?: number;
    lng?: number;
    description?: string;
    photo?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 }
    );
  }

  const { lat, lng, description, photo } = body;

  if (!rateLimit(`reports:${clientIp(request.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Terlalu banyak laporan. Coba lagi beberapa menit lagi." },
      { status: 429 }
    );
  }

  const validationError =
    validateBaliCoordinates(lat, lng) ??
    (photo ? validateImageDataUrl(photo) : "Foto diperlukan.") ??
    (description && description.length > MAX_DESCRIPTION_LENGTH
      ? `Keterangan maksimal ${MAX_DESCRIPTION_LENGTH} karakter.`
      : null);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Convert base64 data URL to Blob for storage upload
    const base64Response = await fetch(photo as string);
    const blob = await base64Response.blob();

    const filename = `${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("report-photos")
      .upload(filename, blob, { contentType: "image/jpeg" });

    if (uploadError) {
      return NextResponse.json(
        { error: "Gagal menyimpan laporan. Silakan coba lagi." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("report-photos")
      .getPublicUrl(filename);

    const photoUrl = publicUrlData.publicUrl;

    const { data: reportData, error: insertError } = await supabase
      .from("waste_reports")
      .insert({
        lat,
        lng,
        description: description || null,
        photo_url: photoUrl,
        status: "reported",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Gagal menyimpan laporan. Silakan coba lagi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { report: reportData as WasteReport },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan laporan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
