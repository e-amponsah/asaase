/** A 1080 × 1350 image of the current view for sharing (WhatsApp, social), drawn on a canvas. */

interface CardInput {
  map: HTMLCanvasElement | null;   // the main map canvas (needs preserveDrawingBuffer)
  crop?: { x: number; y: number; w: number; h: number }; // the part of the canvas not hidden by the panel/time bar (canvas px)
  kicker: string;                  // e.g. "Galamsey · Offin River"
  title: string;
  value: string;                   // headline number, e.g. "141 km²"
  label: string;                   // what the number is, e.g. "Damaged land"
  date: string;                    // e.g. "22 Oct 2026"
  color: string;                   // the story's data colour
  url: string;                     // link printed on the card
}

const W = 1080;
const H = 1350;
const MAP_H = 800;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function makeShareCard(c: CardInput): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0b0f0e";
  ctx.fillRect(0, 0, W, H);

  // Map snapshot, cropped to fill the top of the card.
  if (c.map && c.map.width > 0) {
    const r = c.crop ?? { x: 0, y: 0, w: c.map.width, h: c.map.height };
    const s = Math.max(W / r.w, MAP_H / r.h);
    const sw = W / s;
    const sh = MAP_H / s;
    ctx.drawImage(c.map, r.x + (r.w - sw) / 2, r.y + (r.h - sh) / 2, sw, sh, 0, 0, W, MAP_H);
  }
  const fade = ctx.createLinearGradient(0, MAP_H - 260, 0, MAP_H);
  fade.addColorStop(0, "rgba(11,15,14,0)");
  fade.addColorStop(1, "rgba(11,15,14,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, MAP_H - 260, W, 260);

  // Kente band along the top: gold, green, gold, red, black.
  const band: [string, number][] = [["#e8b23a", 28], ["#2fa36b", 12], ["#e8b23a", 12], ["#d64534", 8], ["#050505", 6]];
  for (let x = 0; x < W;) for (const [col, w] of band) { ctx.fillStyle = col; ctx.fillRect(x, 0, w * 1.6, 8); x += w * 1.6; }

  const pad = 72;
  let y = MAP_H + 10;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#84948f";
  ctx.font = "500 30px Inter, system-ui, sans-serif";
  ctx.fillText(c.kicker, pad, y);
  y += 66;
  ctx.fillStyle = "#edf2f0";
  ctx.font = "650 60px Inter, system-ui, sans-serif";
  for (const line of wrap(ctx, c.title, W - 2 * pad)) { ctx.fillText(line, pad, y); y += 68; }

  y += 40;
  ctx.fillStyle = c.color;
  ctx.font = "700 120px Inter, system-ui, sans-serif";
  ctx.fillText(c.value, pad, y + 70);
  ctx.fillStyle = "#b9c5c1";
  ctx.font = "500 34px Inter, system-ui, sans-serif";
  ctx.fillText(`${c.label} · ${c.date}`, pad, y + 130);

  // Footer: where it's from.
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(pad, H - 120, W - 2 * pad, 2);
  ctx.fillStyle = "#edf2f0";
  ctx.font = "650 32px Inter, system-ui, sans-serif";
  ctx.fillText(c.url, pad, H - 64);
  ctx.fillStyle = "#84948f";
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  const credit = "Radar: NASA-ISRO NISAR";
  ctx.fillText(credit, W - pad - ctx.measureText(credit).width, H - 64);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

/** On phones and tablets, use the share sheet (WhatsApp and so on); on desktops, download the image. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = window.matchMedia?.("(pointer: coarse)").matches;
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      /* cancelled or blocked: fall back to a download */
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "downloaded";
}
