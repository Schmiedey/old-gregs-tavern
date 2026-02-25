/* ═══════════════════════════════════════════
   particles.js — Canvas particle effects
   Embers, sparks, confetti, snow
   ═══════════════════════════════════════════ */

const Particles = (() => {
  let canvas = null;
  let ctx = null;
  let particles = [];
  let raf = null;
  let mode = "embers";

  const MODES = {
    embers: { count: 40, color: () => `hsl(${20 + Math.random() * 25}, 90%, ${50 + Math.random() * 30}%)`, sizeMin: 1, sizeMax: 4, speedY: -0.4, speedX: 0.15, life: 300, glow: true },
    sparks: { count: 25, color: () => `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`, sizeMin: 1, sizeMax: 3, speedY: -2, speedX: 1.5, life: 40, glow: true },
    confetti: { count: 60, color: () => `hsl(${Math.random() * 360}, 80%, 60%)`, sizeMin: 3, sizeMax: 7, speedY: 1.5, speedX: 1, life: 150, glow: false },
    snow: { count: 50, color: () => `rgba(255,255,255,${0.3 + Math.random() * 0.5})`, sizeMin: 1, sizeMax: 4, speedY: 0.5, speedX: 0.3, life: 400, glow: false },
    mystical: { count: 30, color: () => `hsl(${260 + Math.random() * 40}, 80%, ${50 + Math.random() * 30}%)`, sizeMin: 1, sizeMax: 3, speedY: -0.3, speedX: 0.2, life: 250, glow: true },
    blood: { count: 15, color: () => `hsl(0, ${70 + Math.random() * 30}%, ${30 + Math.random() * 20}%)`, sizeMin: 2, sizeMax: 5, speedY: 2, speedX: 1, life: 30, glow: false },
  };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
  }

  function spawn(m = "embers", count) {
    const cfg = MODES[m] || MODES.embers;
    const n = count || cfg.count;
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * (canvas?.width || 800),
        y: m === "confetti" ? -10 : (m === "snow" ? -10 : (canvas?.height || 600) + 10),
        size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
        color: cfg.color(),
        vx: (Math.random() - 0.5) * cfg.speedX * 2,
        vy: (m === "embers" || m === "mystical" || m === "sparks") ? -(Math.random() * Math.abs(cfg.speedY) + 0.1) : (Math.random() * cfg.speedY + 0.3),
        life: cfg.life + Math.random() * cfg.life * 0.5,
        maxLife: cfg.life + Math.random() * cfg.life * 0.5,
        glow: cfg.glow,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  function update() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.rotation += p.rotSpeed;

      if (p.life <= 0) { particles.splice(i, 1); continue; }

      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.glow) {
        ctx.shadowBlur = p.size * 4;
        ctx.shadowColor = p.color;
      }

      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    raf = requestAnimationFrame(update);
  }

  function start(m = "embers") {
    mode = m;
    stop();
    spawn(m);
    update();
  }

  function burst(m = "sparks", count = 20) {
    spawn(m, count);
    if (!raf) update();
  }

  function continuous(m = "embers", interval = 200) {
    mode = m;
    if (!raf) update();
    const id = setInterval(() => {
      if (particles.length < 100) spawn(m, 3);
    }, interval);
    return id;
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    particles = [];
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setMode(m) { mode = m; }
  function isRunning() { return !!raf; }

  return { init, start, burst, continuous, stop, resize, setMode, isRunning, spawn };
})();
