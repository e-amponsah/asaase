/**
 * "Listen to the land": plays a time series as a drum pattern.
 * A steady, deep beat means little change. As change grows the drum climbs and thins out,
 * and a dry crackle joins in, so you hear the rhythm break.
 */
export function playSeries(
  values: number[],
  opts: { stepMs?: number; onStep?: (i: number) => void; onEnd?: () => void } = {},
): () => void {
  const { stepMs = 480, onStep, onEnd } = opts;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const t0 = ctx.currentTime + 0.12;
  const timers: number[] = [];

  values.forEach((v, i) => {
    const n = (v - min) / span; // 0 = baseline, 1 = most change
    const t = t0 + (i * stepMs) / 1000;
    drum(ctx, t, 70 + n * 90, 0.9 - n * 0.35);
    if (n < 0.6) drum(ctx, t + stepMs / 2000, 140, 0.28); // the off-beat fades as change grows
    if (n > 0.35) crackle(ctx, t + stepMs / 4000, 0.08 + n * 0.25);
    timers.push(window.setTimeout(() => onStep?.(i), (t - ctx.currentTime) * 1000));
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    timers.forEach(clearTimeout);
    void ctx.close();
  };
  const end = window.setTimeout(() => {
    close();
    onEnd?.();
  }, values.length * stepMs + 600);

  return () => {
    clearTimeout(end);
    close();
  };
}

function drum(ctx: AudioContext, t: number, freq: number, gain: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 2, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.55);
}

function crackle(ctx: AudioContext, t: number, gain: number) {
  const len = Math.floor(ctx.sampleRate * 0.12);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const band = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  band.type = "bandpass";
  band.frequency.value = 2400;
  g.gain.value = gain;
  src.connect(band).connect(g).connect(ctx.destination);
  src.start(t);
}
