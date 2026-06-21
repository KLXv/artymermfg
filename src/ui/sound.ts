/**
 * A synthesized "power-on" — no audio file, designed with the Web Audio API so
 * it's tiny, tunable and on-brand: a warm sub-bass swell, a precision tick, and
 * a soft two-note chime (a perfect fifth) resolving. Subtle by default. Plays
 * best-effort; if the browser blocks audio before a gesture, it stays silent.
 */
let ctx: AudioContext | null = null;

export function playPowerOn() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const t0 = ctx.currentTime + 0.03;
    const master = ctx.createGain();
    master.gain.value = 0.16;
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 6500;
    master.connect(warm);
    warm.connect(ctx.destination);

    // Sub-bass swell — the machine waking.
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(68, t0);
    sub.frequency.exponentialRampToValueAtTime(150, t0 + 0.55);
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0.0001, t0);
    subG.gain.exponentialRampToValueAtTime(0.5, t0 + 0.12);
    subG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);
    sub.connect(subG);
    subG.connect(master);
    sub.start(t0);
    sub.stop(t0 + 0.8);

    // Precision tick — a mechanical click.
    const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    const tick = ctx.createBufferSource();
    tick.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 1.3;
    const tickG = ctx.createGain();
    tickG.gain.value = 0.45;
    tick.connect(bp);
    bp.connect(tickG);
    tickG.connect(master);
    tick.start(t0);

    // Two-note chime resolving (C5 + G5) — the "ready".
    [523.25, 783.99].forEach((f, i) => {
      const o = ctx!.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx!.createGain();
      const start = t0 + 0.24 + i * 0.05;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.34 - i * 0.12, start + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);
      o.connect(g);
      g.connect(master);
      o.start(start);
      o.stop(start + 1.35);
    });
  } catch {
    /* audio unavailable — stay silent */
  }
}
