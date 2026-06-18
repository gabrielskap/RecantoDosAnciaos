const PALETTE = [
  '#1e40af','#1d4ed8','#2563eb','#0f766e','#059669',
  '#7c3aed','#9333ea','#c2410c','#b45309','#be123c',
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Returns photoUrl if present, otherwise a self-contained SVG data-URI avatar. */
export function residentAvatarSrc(name: string, photoUrl?: string | null): string {
  if (photoUrl) return photoUrl;
  const bg = colorForName(name || '?');
  const letters = initials(name || '?');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="16" fill="${bg}"/>
    <text x="100" y="115" font-family="system-ui,sans-serif" font-size="80" font-weight="700"
          fill="white" text-anchor="middle" dominant-baseline="middle">${letters}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
