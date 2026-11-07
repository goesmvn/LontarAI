export const REGENCIES = [
  "Badung", "Bangli", "Buleleng", "Denpasar", "Gianyar",
  "Jembrana", "Karangasem", "Klungkung", "Tabanan",
] as const;

export const AFFILIATIONS = ["Griya", "Puri", "Pura", "Banjar", "Lembaga", "Pribadi"] as const;
export const CATEGORY_LABELS: Record<string, string> = {
  usada: "Usada (pengobatan)", wariga: "Wariga (kalender/astronomi)", babad: "Babad (sejarah)",
  tattwa: "Tattwa (filsafat)", kidung: "Kidung (sastra)", lainnya: "Lainnya",
};
