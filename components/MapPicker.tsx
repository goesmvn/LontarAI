"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const icon = L.divIcon({
  className: "",
  html: '<div style="background:#b4532a;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Clicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapPicker({
  lat, lng, onPick,
}: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={lat != null && lng != null ? [lat, lng] : [-8.4095, 115.1889]} zoom={9}
      style={{ height: 240, width: "100%", borderRadius: 12 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
      <Clicker onPick={onPick} />
      {lat != null && lng != null && <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
  );
}
