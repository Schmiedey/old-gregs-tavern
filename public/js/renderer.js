/* ═══════════════════════════════════════════
   renderer.js — Canvas rendering pipeline
   Draws tilemap, entities, player, FX,
   minimap. Handles canvas sizing + pixel scale.
   ═══════════════════════════════════════════ */

const Renderer = (() => {
  let canvas, ctx;
  const TARGET_W = 640;
  const TARGET_H = 480;
  let scale = 1;

  function init() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // Maintain 4:3 aspect
    scale = Math.min(cw / TARGET_W, ch / TARGET_H);
    // Use integer scale for crisp pixels (minimum 1)
    const intScale = Math.max(1, Math.floor(scale));

    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    canvas.style.width = (TARGET_W * intScale) + "px";
    canvas.style.height = (TARGET_H * intScale) + "px";

    // Nearest-neighbor for pixel art
    ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = "pixelated";

    Camera.setSize(TARGET_W, TARGET_H);
  }

  function draw(charData) {
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#0d0b0e";
    ctx.fillRect(0, 0, TARGET_W, TARGET_H);

    const cam = Camera.getView();

    // Draw tilemap
    TileMap.draw(ctx, cam);

    // Gather everything that needs Y-sorting
    const drawList = [];

    // Entities
    const entities = Entities.getAll();
    for (const e of entities) {
      if (e.kind === "particle" || e.kind === "floatingText") {
        // Draw particles on top after Y-sort pass
        continue;
      }
      drawList.push({ y: e.y + (e.h || 32), draw: () => drawEntity(e, cam) });
    }

    // Player
    const pp = Player.getPos();
    drawList.push({ y: pp.y + 32, draw: () => Player.draw(ctx, cam) });

    // Sort by Y (bottom of sprite)
    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.draw();

    // Particles & floating text on top
    for (const e of entities) {
      if (e.kind === "particle") drawParticle(e, cam);
      else if (e.kind === "floatingText") drawFloatingText(e, cam);
    }

    // Dialogue box
    Dialogue.draw(ctx);

    // Transition fade
    drawFade();
  }

  function drawEntity(e, cam) {
    const sx = Math.floor(e.x - cam.x);
    const sy = Math.floor(e.y - cam.y);
    if (sx < -64 || sy < -64 || sx > TARGET_W + 32 || sy > TARGET_H + 32) return;

    // Flash on damage
    if (e.flashTimer > 0 && Math.floor(e.flashTimer / 60) % 2 === 0) return;

    const T = Sprites.TILE;

    if (e.kind === "enemy") {
      if (e.hp <= 0) return;
      const sprite = Sprites.enemySprite(e.enemyType || "goblin");
      ctx.drawImage(sprite, (e.frame || 0) * T, 0, T, T, sx, sy, T, T);

      // HP bar above enemy
      if (e.hp < e.maxHp) {
        const hpPct = e.hp / e.maxHp;
        const barW = 24;
        const bx = sx + (T - barW) / 2;
        const by = sy - 6;
        ctx.fillStyle = "#333";
        ctx.fillRect(bx, by, barW, 4);
        ctx.fillStyle = hpPct > 0.5 ? "#4a4" : hpPct > 0.25 ? "#ca4" : "#c44";
        ctx.fillRect(bx, by, barW * hpPct, 4);
      }
      // Name above
      ctx.fillStyle = "#fff";
      ctx.font = "7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(e.name, sx + T / 2, sy - 9);
      ctx.textAlign = "left";

    } else if (e.kind === "npc") {
      const sprite = Sprites.npcSprite(e.npcType || "default", e.colorHue);
      ctx.drawImage(sprite, (e.frame || 0) * T, 0, T, T, sx, sy, T, T);
      // Name tag above NPC
      ctx.font = "8px sans-serif";
      ctx.fillStyle = "#ffd700";
      ctx.textAlign = "center";
      ctx.fillText(e.name, sx + T / 2, sy - 4);
      ctx.textAlign = "left";

    } else if (e.kind === "item") {
      const sprite = Sprites.item(e.itemType || "gold");
      const bob = Math.sin(Date.now() / 300) * 2;
      ctx.drawImage(sprite, sx + 8, sy + 6 + bob);
      // Item label
      ctx.font = "7px monospace";
      ctx.fillStyle = "#44ff88";
      ctx.textAlign = "center";
      ctx.fillText(e.name, sx + 16, sy - 2);
      ctx.textAlign = "left";
    }
  }

  function drawParticle(p, cam) {
    const sx = Math.floor(p.x - cam.x);
    const sy = Math.floor(p.y - cam.y);
    ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1));
    ctx.fillStyle = p.color || "#ffaa00";
    ctx.fillRect(sx, sy, p.size || 3, p.size || 3);
    ctx.globalAlpha = 1;
  }

  function drawFloatingText(ft, cam) {
    const sx = Math.floor(ft.x - cam.x);
    const sy = Math.floor(ft.y - cam.y);
    ctx.globalAlpha = Math.max(0, ft.life / (ft.maxLife || 1));
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = ft.color || "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(ft.text, sx, sy);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  /* ─── Screen transition fade ─── */
  let fadeAlpha = 0;
  let fading = false;
  let fadeDir = 1; // 1 = fading in (to black), -1 = fading out

  function startFadeOut(cb) {
    fading = true;
    fadeDir = 1;
    fadeAlpha = 0;
    const interval = setInterval(() => {
      fadeAlpha += 0.05;
      if (fadeAlpha >= 1) {
        fadeAlpha = 1;
        clearInterval(interval);
        if (cb) cb();
      }
    }, 16);
  }

  function startFadeIn() {
    fading = true;
    fadeDir = -1;
    fadeAlpha = 1;
    const interval = setInterval(() => {
      fadeAlpha -= 0.04;
      if (fadeAlpha <= 0) {
        fadeAlpha = 0;
        fading = false;
        clearInterval(interval);
      }
    }, 16);
  }

  function drawFade() {
    if (fadeAlpha > 0) {
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle = "#0d0b0e";
      ctx.fillRect(0, 0, TARGET_W, TARGET_H);
      ctx.globalAlpha = 1;
    }
  }

  function getCanvas() { return canvas; }
  function getCtx() { return ctx; }
  function getSize() { return { w: TARGET_W, h: TARGET_H }; }

  return {
    init, resize, draw, getCanvas, getCtx, getSize,
    startFadeOut, startFadeIn,
  };
})();
