"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

export type ArchiveItem = {
  slug: string; title: string; category: string; regency: string; village_banjar: string;
  latitude: number; longitude: number; owner_name: string | null; image_url: string;
  latin_transliteration: string; unicode_transcription: string; translation_id: string | null;
  transcription_status: string; estimated_creation_era: string | null;
};

const icon = L.divIcon({
  className: "",
  html: '<div style="background:#b4532a;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function ArchiveMap({ items, onSelect }: { items: ArchiveItem[]; onSelect: (i: ArchiveItem) => void }) {
  return (
    <MapContainer center={[-8.4095, 115.1889]} zoom={9} style={{ height: 420, width: "100%", borderRadius: 12 }} scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
      {items.map((i) => (
        <Marker key={i.slug} position={[i.latitude, i.longitude]} icon={icon} eventHandlers={{ click: () => onSelect(i) }} />
      ))}
    </MapContainer>
  );
}
