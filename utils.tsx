// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Map a value from one range to another
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// Convert degrees to radians
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Convert radians to degrees
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

// Generate a poetic timestamp
export function poeticTime(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const poetic = hours < 6
    ? 'before dawn'
    : hours < 12
    ? 'morning light'
    : hours < 18
    ? 'solar bloom'
    : 'twilight pulse';
  return `${poetic}, ${hours}:${minutes.toString().padStart(2, '0')}`;
}

// Normalize mood intensity (0–1)
export function normalizeMood(raw: number): number {
  return clamp(mapRange(raw, -100, 100, 0, 1), 0, 1);
}

// Generate a color from mood intensity
export function moodColor(mood: number): string {
  const hue = mapRange(mood, 0, 1, 240, 0); // blue to red
  return `hsl(${hue}, 100%, 50%)`;
}

// Format species tag
export function formatSpeciesTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
