/* ═══════════════════════════════════════════
   sprites.js — Pixel art sprite generator
   Procedurally generates all game sprites
   on canvas. No external image files needed.
   ═══════════════════════════════════════════ */

const Sprites = (() => {
  const TILE = 32; // pixels per tile
  const cache = new Map();

  // Color palettes
  const PAL = {
    skin: { Human: "#d4a574", Elf: "#f0e6d2", Dwarf: "#c9956b", Halfling: "#e0c4a0", Orc: "#5a7a4a", Tiefling: "#8b3a62" },
    hair: { Human: "#4a3728", Elf: "#c4a35a", Dwarf: "#8b4513", Halfling: "#6b4423", Orc: "#2d3a22", Tiefling: "#1a0a2e" },
    classColor: { Warrior: "#c44", Mage: "#88f", Rogue: "#666", Cleric: "#ffd700", Ranger: "#5a5", Bard: "#58c" },
    classAccent: { Warrior: "#844", Mage: "#448", Rogue: "#444", Cleric: "#886600", Ranger: "#363", Bard: "#338" },
  };

  function getKey(...args) { return args.join("|"); }

  function getCached(key, w, h, drawFn) {
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    drawFn(ctx, w, h);
    cache.set(key, c);
    return c;
  }

  /* ─── Player sprite (4 directions × 2 frames) ─── */
  function playerSheet(race, charClass) {
    const key = getKey("player", race, charClass);
    // 4 directions (down, left, right, up) × 2 walk frames = 8 frames
    return getCached(key, TILE * 2, TILE * 4, (ctx) => {
      const skin = PAL.skin[race] || PAL.skin.Human;
      const hair = PAL.hair[race] || PAL.hair.Human;
      const shirt = PAL.classColor[charClass] || "#888";
      const pants = PAL.classAccent[charClass] || "#555";

      const dirs = [
        { ey: 0 },  // down (face camera)
        { ey: -1 }, // left
        { ey: 1 },  // right
        { ey: -2 }, // up (back)
      ];

      dirs.forEach((dir, di) => {
        for (let frame = 0; frame < 2; frame++) {
          const ox = frame * TILE;
          const oy = di * TILE;
          const cx = ox + TILE / 2;
          const legOff = frame === 0 ? 0 : 2;

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath();
          ctx.ellipse(cx, oy + 30, 8, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Legs
          ctx.fillStyle = pants;
          ctx.fillRect(cx - 5 - legOff, oy + 22, 4, 8);
          ctx.fillRect(cx + 1 + legOff, oy + 22, 4, 8);

          // Body
          ctx.fillStyle = shirt;
          ctx.fillRect(cx - 7, oy + 12, 14, 12);

          // Arms
          ctx.fillStyle = skin;
          ctx.fillRect(cx - 9, oy + 13, 3, 8);
          ctx.fillRect(cx + 6, oy + 13, 3, 8);

          // Head
          ctx.fillStyle = skin;
          ctx.beginPath();
          ctx.arc(cx, oy + 9, 7, 0, Math.PI * 2);
          ctx.fill();

          // Hair
          ctx.fillStyle = hair;
          if (di === 3) {
            // Back of head — full hair
            ctx.beginPath();
            ctx.arc(cx, oy + 8, 7, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Top hair
            ctx.beginPath();
            ctx.arc(cx, oy + 7, 7, Math.PI, Math.PI * 2);
            ctx.fill();
          }

          // Face (only if not facing away)
          if (di !== 3) {
            ctx.fillStyle = "#222";
            if (di === 0) {
              // Down — two eyes
              ctx.fillRect(cx - 3, oy + 8, 2, 2);
              ctx.fillRect(cx + 1, oy + 8, 2, 2);
            } else if (di === 1) {
              // Left — one eye on left side
              ctx.fillRect(cx - 3, oy + 8, 2, 2);
            } else {
              // Right — one eye on right side
              ctx.fillRect(cx + 1, oy + 8, 2, 2);
            }
          }

          // Race features
          if (race === "Elf") {
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.moveTo(cx - 7, oy + 7); ctx.lineTo(cx - 12, oy + 3); ctx.lineTo(cx - 7, oy + 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx + 7, oy + 7); ctx.lineTo(cx + 12, oy + 3); ctx.lineTo(cx + 7, oy + 5); ctx.fill();
          }
          if (race === "Orc") {
            ctx.fillStyle = "#fff";
            ctx.fillRect(cx - 2, oy + 12, 2, 2);
            ctx.fillRect(cx + 1, oy + 12, 2, 2);
          }
          if (race === "Tiefling") {
            ctx.fillStyle = "#a33";
            ctx.beginPath(); ctx.moveTo(cx - 4, oy + 2); ctx.lineTo(cx - 6, oy - 4); ctx.lineTo(cx - 2, oy + 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx + 4, oy + 2); ctx.lineTo(cx + 6, oy - 4); ctx.lineTo(cx + 2, oy + 2); ctx.fill();
          }
          if (race === "Dwarf") {
            ctx.fillStyle = hair;
            ctx.fillRect(cx - 4, oy + 11, 8, 4);
          }
        }
      });
    });
  }

  /* ─── NPC sprites ─── */
  function npcSprite(type, colorHue) {
    const key = getKey("npc", type, colorHue);
    return getCached(key, TILE * 2, TILE, (ctx) => {
      const hue = colorHue || 200;
      for (let frame = 0; frame < 2; frame++) {
        const ox = frame * TILE;
        const cx = ox + TILE / 2;
        const legOff = frame === 0 ? 0 : 1;

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(cx, 30, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `hsl(${hue}, 40%, 35%)`;
        ctx.fillRect(cx - 5 - legOff, 22, 4, 8);
        ctx.fillRect(cx + 1 + legOff, 22, 4, 8);

        ctx.fillStyle = `hsl(${hue}, 50%, 45%)`;
        ctx.fillRect(cx - 7, 12, 14, 12);

        ctx.fillStyle = "#d4a574";
        ctx.fillRect(cx - 9, 13, 3, 8);
        ctx.fillRect(cx + 6, 13, 3, 8);

        ctx.fillStyle = "#d4a574";
        ctx.beginPath(); ctx.arc(cx, 9, 7, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `hsl(${hue}, 30%, 25%)`;
        ctx.beginPath(); ctx.arc(cx, 7, 7, Math.PI, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#222";
        ctx.fillRect(cx - 3, 8, 2, 2);
        ctx.fillRect(cx + 1, 8, 2, 2);

        // NPC indicator
        if (type === "merchant") {
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(cx - 2, 0, 4, 3);
        } else if (type === "quest") {
          ctx.fillStyle = "#ffd700";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", cx, 4);
        }
      }
    });
  }

  /* ─── Enemy sprites ─── */
  function enemySprite(type) {
    const key = getKey("enemy", type);
    const configs = {
      rat:     { color: "#8a7a6a", size: 0.6, shape: "beast" },
      wolf:    { color: "#6a6a7a", size: 0.8, shape: "beast" },
      goblin:  { color: "#5a8a4a", size: 0.8, shape: "humanoid" },
      bandit:  { color: "#7a5a4a", size: 1.0, shape: "humanoid" },
      skeleton:{ color: "#d0d0c0", size: 1.0, shape: "humanoid" },
      spider:  { color: "#3a3a4a", size: 0.7, shape: "beast" },
      slime:   { color: "#4a8a4a", size: 0.6, shape: "blob" },
      orc:     { color: "#5a7a4a", size: 1.1, shape: "humanoid" },
      troll:   { color: "#6a8a5a", size: 1.3, shape: "humanoid" },
      dragon:  { color: "#8a2a2a", size: 1.5, shape: "beast" },
      ghost:   { color: "#aaaacc", size: 1.0, shape: "ghost" },
      bat:     { color: "#4a3a4a", size: 0.5, shape: "beast" },
    };
    const cfg = configs[type] || configs.goblin;

    return getCached(key, TILE * 2, TILE, (ctx) => {
      for (let frame = 0; frame < 2; frame++) {
        const ox = frame * TILE;
        const cx = ox + TILE / 2;
        const s = cfg.size;
        const bob = frame === 0 ? 0 : 2;

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(cx, 30, 7 * s, 3, 0, 0, Math.PI * 2); ctx.fill();

        if (cfg.shape === "humanoid") {
          ctx.fillStyle = cfg.color;
          ctx.fillRect(cx - 5 * s, 22 - bob, 4 * s, 8 * s);
          ctx.fillRect(cx + 1 * s, 22 - bob, 4 * s, 8 * s);
          ctx.fillRect(cx - 7 * s, 12 - bob, 14 * s, 12 * s);
          ctx.beginPath(); ctx.arc(cx, 9 * s - bob, 7 * s, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#c00";
          ctx.fillRect(cx - 2, 8 * s - bob, 2, 2);
          ctx.fillRect(cx + 1, 8 * s - bob, 2, 2);
        } else if (cfg.shape === "beast") {
          ctx.fillStyle = cfg.color;
          ctx.beginPath(); ctx.ellipse(cx, 20 - bob, 10 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 6 * s, 14 - bob, 5 * s, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#c00";
          ctx.fillRect(cx + 5 * s, 12 - bob, 2, 2);
        } else if (cfg.shape === "blob") {
          ctx.fillStyle = cfg.color;
          ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.ellipse(cx, 22 - bob, 10 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#fff";
          ctx.fillRect(cx - 3, 18 - bob, 3, 3);
          ctx.fillRect(cx + 1, 18 - bob, 3, 3);
        } else if (cfg.shape === "ghost") {
          ctx.fillStyle = cfg.color;
          ctx.globalAlpha = 0.6;
          ctx.beginPath(); ctx.ellipse(cx, 18 - bob, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#000";
          ctx.fillRect(cx - 4, 14 - bob, 3, 3);
          ctx.fillRect(cx + 1, 14 - bob, 3, 3);
          ctx.fillRect(cx - 2, 20 - bob, 4, 3);
        }
      }
    });
  }

  /* ─── Tile sprites ─── */
  function tile(type) {
    const key = getKey("tile", type);
    return getCached(key, TILE, TILE, (ctx) => {
      switch (type) {
        case "grass":
          ctx.fillStyle = "#3a6a2a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#4a7a3a";
          for (let i = 0; i < 6; i++) {
            const gx = Math.random() * TILE;
            const gy = Math.random() * TILE;
            ctx.fillRect(gx, gy, 2, 4);
          }
          break;
        case "grass2":
          ctx.fillStyle = "#357028";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#4d8a3d";
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.random() * 28, Math.random() * 28, 3, 3);
          break;
        case "dirt":
          ctx.fillStyle = "#6a5a3a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#7a6a4a";
          for (let i = 0; i < 3; i++) ctx.fillRect(Math.random() * 28, Math.random() * 28, 4, 3);
          break;
        case "path":
          ctx.fillStyle = "#8a7a5a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#9a8a6a";
          for (let i = 0; i < 2; i++) ctx.fillRect(Math.random() * 28, Math.random() * 28, 5, 3);
          break;
        case "stone":
          ctx.fillStyle = "#5a5a6a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.strokeStyle = "#4a4a5a";
          ctx.lineWidth = 1;
          ctx.strokeRect(1, 1, 15, 15);
          ctx.strokeRect(16, 1, 15, 15);
          ctx.strokeRect(1, 16, 15, 15);
          ctx.strokeRect(16, 16, 15, 15);
          break;
        case "wood":
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.strokeStyle = "#5a3a1a";
          ctx.lineWidth = 1;
          for (let y = 0; y < TILE; y += 8) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke();
          }
          break;
        case "water":
          ctx.fillStyle = "#2a4a8a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#3a5a9a";
          ctx.fillRect(4, 8, 12, 2);
          ctx.fillRect(18, 20, 10, 2);
          break;
        case "wall":
          ctx.fillStyle = "#4a4a4a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.strokeStyle = "#3a3a3a";
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, TILE, 16);
          ctx.strokeRect(0, 16, TILE, 16);
          ctx.fillStyle = "#555";
          ctx.fillRect(2, 2, 12, 12);
          ctx.fillRect(18, 18, 12, 12);
          break;
        case "wall_dark":
          ctx.fillStyle = "#2a2a3a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.strokeStyle = "#1a1a2a";
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, TILE, 16);
          ctx.strokeRect(0, 16, TILE, 16);
          break;
        case "door":
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(4, 0, 24, TILE);
          ctx.fillStyle = "#8a6a3a";
          ctx.fillRect(6, 2, 20, 28);
          ctx.fillStyle = "#ffd700";
          ctx.beginPath(); ctx.arc(22, 16, 2, 0, Math.PI * 2); ctx.fill();
          break;
        case "tavern_floor":
          ctx.fillStyle = "#5a4030";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.strokeStyle = "#4a3020";
          ctx.lineWidth = 1;
          for (let y = 0; y < TILE; y += 8) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke();
          }
          ctx.fillStyle = "#6a5040";
          ctx.fillRect(8, 4, 16, 6);
          break;
        case "bar":
          ctx.fillStyle = "#4a3020";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(2, 4, 28, 24);
          ctx.fillStyle = "#8a6a3a";
          ctx.fillRect(4, 6, 24, 4);
          break;
        case "table":
          ctx.fillStyle = "#5a4030"; // floor underneath
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(4, 6, 24, 20);
          ctx.fillStyle = "#7a5a3a";
          ctx.fillRect(6, 8, 20, 16);
          break;
        case "chair":
          ctx.fillStyle = "#5a4030";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(10, 10, 12, 14);
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(12, 6, 8, 6);
          break;
        case "tree":
          ctx.fillStyle = "#3a6a2a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(12, 18, 8, 14);
          ctx.fillStyle = "#2a5a1a";
          ctx.beginPath(); ctx.arc(16, 14, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#3a7a2a";
          ctx.beginPath(); ctx.arc(16, 12, 8, 0, Math.PI * 2); ctx.fill();
          break;
        case "bush":
          ctx.fillStyle = "#3a6a2a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#2a5a1a";
          ctx.beginPath(); ctx.ellipse(16, 20, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#3a6a2a";
          ctx.beginPath(); ctx.ellipse(16, 18, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case "chest":
          ctx.fillStyle = "#3a6a2a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(6, 12, 20, 14);
          ctx.fillStyle = "#8a6a3a";
          ctx.fillRect(8, 14, 16, 10);
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(14, 18, 4, 4);
          break;
        case "stairs_down":
          ctx.fillStyle = "#4a4a4a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#222";
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(6 + i * 2, 6 + i * 6, 20 - i * 4, 4);
          }
          break;
        case "stairs_up":
          ctx.fillStyle = "#4a4a4a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#666";
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(6 + i * 2, 24 - i * 6, 20 - i * 4, 4);
          }
          break;
        case "lava":
          ctx.fillStyle = "#8a2a0a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.fillStyle = "#ca4a1a";
          ctx.fillRect(4, 4, 10, 8);
          ctx.fillRect(16, 16, 12, 8);
          break;
        case "carpet":
          ctx.fillStyle = "#6a2a2a";
          ctx.fillRect(0, 0, TILE, TILE);
          ctx.strokeStyle = "#8a3a3a";
          ctx.lineWidth = 1;
          ctx.strokeRect(4, 4, 24, 24);
          ctx.strokeRect(8, 8, 16, 16);
          break;
        case "void":
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, TILE, TILE);
          break;
        default:
          ctx.fillStyle = "#333";
          ctx.fillRect(0, 0, TILE, TILE);
      }
    });
  }

  /* ─── Item sprites ─── */
  function item(type) {
    const key = getKey("item", type);
    return getCached(key, 16, 16, (ctx) => {
      switch (type) {
        case "health_potion":
          ctx.fillStyle = "#c44"; ctx.fillRect(5, 6, 6, 8);
          ctx.fillStyle = "#e66"; ctx.fillRect(6, 7, 4, 6);
          ctx.fillStyle = "#aaa"; ctx.fillRect(6, 4, 4, 3);
          break;
        case "mana_potion":
          ctx.fillStyle = "#44c"; ctx.fillRect(5, 6, 6, 8);
          ctx.fillStyle = "#66e"; ctx.fillRect(6, 7, 4, 6);
          ctx.fillStyle = "#aaa"; ctx.fillRect(6, 4, 4, 3);
          break;
        case "gold":
          ctx.fillStyle = "#ffd700";
          ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#cc9900";
          ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("G", 8, 11);
          break;
        case "sword":
          ctx.fillStyle = "#ccc"; ctx.fillRect(7, 2, 2, 10);
          ctx.fillStyle = "#8a6a3a"; ctx.fillRect(5, 11, 6, 2);
          ctx.fillStyle = "#6a4a2a"; ctx.fillRect(7, 13, 2, 3);
          break;
        case "key":
          ctx.fillStyle = "#ffd700";
          ctx.beginPath(); ctx.arc(6, 5, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(8, 4, 6, 2);
          ctx.fillRect(12, 6, 2, 2);
          ctx.fillRect(10, 6, 2, 2);
          break;
        default:
          ctx.fillStyle = "#aaa";
          ctx.fillRect(3, 3, 10, 10);
      }
    });
  }

  /* ─── Effects ─── */
  function slash(frame) {
    const key = getKey("slash", frame);
    return getCached(key, TILE, TILE, (ctx) => {
      ctx.strokeStyle = `rgba(255, 255, 200, ${1 - frame * 0.25})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const arc = (frame * 0.8);
      ctx.arc(TILE / 2, TILE / 2, 10 + frame * 3, -0.5 + arc, 1.5 + arc);
      ctx.stroke();
    });
  }

  function sparkle(frame) {
    const key = getKey("sparkle", frame);
    return getCached(key, TILE, TILE, (ctx) => {
      const alpha = 1 - frame * 0.2;
      ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
      const s = 3 + frame;
      const cx = TILE / 2, cy = TILE / 2;
      ctx.fillRect(cx - 1, cy - s, 2, s * 2);
      ctx.fillRect(cx - s, cy - 1, s * 2, 2);
    });
  }

  function damageNumber(num, color) {
    const key = getKey("dmg", num, color);
    return getCached(key, 40, 16, (ctx) => {
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(String(num), 21, 13);
      ctx.fillStyle = color || "#fff";
      ctx.fillText(String(num), 20, 12);
    });
  }

  function clearCache() { cache.clear(); }

  return { init: () => {}, TILE, playerSheet, npcSprite, enemySprite, tile, item, slash, sparkle, damageNumber, clearCache, PAL };
})();
