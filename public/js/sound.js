/* ═══════════════════════════════════════════
   sound.js — Web Audio API synthesized SFX
   Ambient variety per location type
   ═══════════════════════════════════════════ */

const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }

  function toggle() { enabled = !enabled; if (!enabled) stopAmbient(); return enabled; }
  function isEnabled() { return enabled; }

  function noiseBuffer(duration = 0.1) {
    ensureCtx();
    const size = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function play(fn) {
    if (!enabled) return;
    ensureCtx();
    try { fn(ctx, ctx.currentTime); } catch (e) { console.warn("Sound:", e); }
  }

  /* ─── SFX ─── */
  function diceRoll() {
    play((c, t) => {
      for (let i = 0; i < 6; i++) {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = "square"; osc.frequency.value = 600 + Math.random() * 800;
        g.gain.setValueAtTime(0.08, t + i * 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.035);
        osc.connect(g).connect(c.destination); osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.035);
      }
    });
  }

  function swordHit() {
    play((c, t) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer(0.08);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2000; bp.Q.value = 5;
      const g = c.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(bp).connect(g).connect(c.destination); src.start(t);
    });
  }

  function magic() {
    play((c, t) => {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.55);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + 0.55);
    });
  }

  function levelUp() {
    play((c, t) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = "triangle"; osc.frequency.value = freq;
        g.gain.setValueAtTime(0.12, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);
        osc.connect(g).connect(c.destination); osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.25);
      });
    });
  }

  function gold() {
    play((c, t) => {
      for (let i = 0; i < 3; i++) {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = "sine"; osc.frequency.value = 2000 + i * 500;
        g.gain.setValueAtTime(0.06, t + i * 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.08);
        osc.connect(g).connect(c.destination); osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.08);
      }
    });
  }

  function heal() {
    play((c, t) => {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(800, t + 0.35);
      g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + 0.4);
    });
  }

  function hit() {
    play((c, t) => {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + 0.12);
    });
  }

  function death() {
    play((c, t) => {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.9);
      g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + 0.9);
    });
  }

  function miss() {
    play((c, t) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer(0.04);
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;
      const g = c.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(hp).connect(g).connect(c.destination); src.start(t);
    });
  }

  function questComplete() {
    play((c, t) => {
      [392, 523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = "triangle"; osc.frequency.value = f;
        g.gain.setValueAtTime(0.1, t + i * 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
        osc.connect(g).connect(c.destination); osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.2);
      });
    });
  }

  function shop() {
    play((c, t) => {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = "sine"; osc.frequency.value = 880;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + 0.15);
    });
  }

  function achievement() {
    play((c, t) => {
      [784, 988, 1175, 1568].forEach((f, i) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = "sine"; osc.frequency.value = f;
        g.gain.setValueAtTime(0.08, t + i * 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
        osc.connect(g).connect(c.destination); osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.15);
      });
    });
  }

  function screenShake() {
    play((c, t) => {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(80, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + 0.15);
    });
  }

  /* ─── Ambient system — varies by location type ─── */
  let ambientNodes = null;
  let currentAmbientType = "tavern";

  const AMBIENT_CONFIGS = {
    tavern:     { freq: 75, type: "sine", vol: 0.015, mod: 0.5 },
    wilderness: { freq: 120, type: "sine", vol: 0.01, mod: 2 },
    cave:       { freq: 45, type: "sine", vol: 0.02, mod: 0.3 },
    dungeon:    { freq: 55, type: "sawtooth", vol: 0.008, mod: 0.4 },
    town:       { freq: 90, type: "sine", vol: 0.012, mod: 1 },
    castle:     { freq: 65, type: "sine", vol: 0.01, mod: 0.6 },
    mountain:   { freq: 200, type: "sine", vol: 0.008, mod: 3 },
    swamp:      { freq: 50, type: "triangle", vol: 0.015, mod: 1.5 },
    temple:     { freq: 110, type: "sine", vol: 0.01, mod: 0.2 },
    road:       { freq: 100, type: "sine", vol: 0.008, mod: 1 },
    ruins:      { freq: 40, type: "sawtooth", vol: 0.008, mod: 0.5 },
    camp:       { freq: 80, type: "triangle", vol: 0.012, mod: 0.8 },
  };

  function startAmbient(locationType) {
    if (!enabled) return;
    const type = locationType || currentAmbientType;
    if (ambientNodes && currentAmbientType === type) return;
    stopAmbient();
    currentAmbientType = type;
    ensureCtx();

    const cfg = AMBIENT_CONFIGS[type] || AMBIENT_CONFIGS.tavern;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = cfg.type;
    osc.frequency.value = cfg.freq;
    g.gain.value = cfg.vol;

    // LFO for subtle movement
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = cfg.mod;
    lfoGain.gain.value = cfg.freq * 0.1;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start();

    osc.connect(g).connect(ctx.destination);
    osc.start();
    ambientNodes = { osc, g, lfo, lfoGain };
  }

  function stopAmbient() {
    if (ambientNodes) {
      try { ambientNodes.osc.stop(); ambientNodes.lfo.stop(); } catch {}
      ambientNodes = null;
    }
  }

  function setAmbientType(type) {
    if (type !== currentAmbientType && AMBIENT_CONFIGS[type]) {
      startAmbient(type);
    }
  }

  return {
    toggle, isEnabled, diceRoll, swordHit, magic, levelUp,
    gold, heal, hit, death, miss, questComplete, shop,
    achievement, screenShake,
    startAmbient, stopAmbient, setAmbientType,
  };
})();
