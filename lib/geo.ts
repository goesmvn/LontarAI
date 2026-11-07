// Public map coordinates are snapped to a ~1.1 km grid (2 decimals) so a
// manuscript's exact location (often a private home) is never exposed.
export function blurCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
