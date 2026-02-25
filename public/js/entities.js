/* ═══════════════════════════════════════════
   entities.js — NPCs, enemies, items on map
   Manages all non-player entities in the world
   ═══════════════════════════════════════════ */

const Entities = (() => {
  const T = Sprites.TILE;
  let entities = [];
  let particles = [];
  let floatingTexts = [];

  function clear() { entities = []; particles = []; floatingTexts = []; }

  function add(entity) {
    entity.id = entity.id || Math.random().toString(36).slice(2, 8);
    entity.frame = 0;
    entity.animTimer = 0;
    entity.flashTimer = 0;
    entities.push(entity);
    return entity;
  }

  function remove(id) {
    entities = entities.filter(e => e.id !== id);
  }

  function getAll() { return [...entities, ...particles, ...floatingTexts]; }
  function getEnemies() { return entities.filter(e => e.kind === "enemy" && e.hp > 0); }
  function getNPCs() { return entities.filter(e => e.kind === "npc"); }
  function getItems() { return entities.filter(e => e.kind === "item"); }

  function getAt(px, py, radius) {
    return entities.find(e => {
      const cx = e.x + T / 2;
      const cy = e.y + T / 2;
      const dx = Math.abs(cx - (px + T / 2));
      const dy = Math.abs(cy - (py + T / 2));
      return dx < radius && dy < radius;
    });
  }

  function getEnemiesInBox(box) {
    return entities.filter(e => {
      if (e.kind !== "enemy" || e.hp <= 0) return false;
      const ex = e.x + 8, ey = e.y + 8, ew = 16, eh = 16;
      return ex < box.x + box.w && ex + ew > box.x && ey < box.y + box.h && ey + eh > box.y;
    });
  }

  function update(dt, playerPos) {
    for (const e of entities) {
      if (e.flashTimer > 0) e.flashTimer -= dt;

      if (e.kind === "enemy" && e.hp > 0) {
        updateEnemy(e, dt, playerPos);
      } else if (e.kind === "npc") {
        updateNPC(e, dt);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update floating text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.8;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function updateEnemy(e, dt, playerPos) {
    e.animTimer += dt;
    if (e.animTimer > 300) { e.frame = (e.frame + 1) % 2; e.animTimer = 0; }

    if (!e.active) return;

    // Simple chase AI
    const dx = playerPos.x - e.x;
    const dy = playerPos.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < T * 6 && dist > T * 0.8) {
      const speed = (e.speed || 1) * 0.8;
      const nx = e.x + (dx / dist) * speed;
      const ny = e.y + (dy / dist) * speed;

      const hitX = nx + 8, hitY = ny + 16;
      if (!TileMap.checkCollision(hitX, hitY, 16, 10)) {
        e.x = nx;
        e.y = ny;
      }
    }

    // Attack cooldown
    if (e.attackCooldown > 0) e.attackCooldown -= dt;
  }

  function updateNPC(e, dt) {
    e.animTimer += dt;
    if (e.animTimer > 500) { e.frame = (e.frame + 1) % 2; e.animTimer = 0; }

    // NPCs wander a bit
    if (!e.wanderTimer) e.wanderTimer = 0;
    e.wanderTimer -= dt;
    if (e.wanderTimer <= 0) {
      e.wanderDir = Math.floor(Math.random() * 5); // 0-3 = move, 4 = stand
      e.wanderTimer = 1000 + Math.random() * 2000;
    }
    if (e.wanderDir < 4) {
      const dirs = [{ dx: 0, dy: 0.3 }, { dx: -0.3, dy: 0 }, { dx: 0.3, dy: 0 }, { dx: 0, dy: -0.3 }];
      const d = dirs[e.wanderDir];
      const nx = e.x + d.dx;
      const ny = e.y + d.dy;
      // Stay near spawn
      const spawnDist = Math.sqrt((nx - e.spawnX) ** 2 + (ny - e.spawnY) ** 2);
      if (spawnDist < T * 2 && !TileMap.checkCollision(nx + 8, ny + 20, 14, 10)) {
        e.x = nx; e.y = ny;
      }
    }
  }

  function draw(ctx, cam) {
    // Sort by Y for depth
    const sorted = [...entities].sort((a, b) => a.y - b.y);

    for (const e of sorted) {
      const dx = Math.round(e.x - cam.x);
      const dy = Math.round(e.y - cam.y);

      if (dx < -T || dy < -T || dx > cam.w + T || dy > cam.h + T) continue;

      // Flash on damage
      if (e.flashTimer > 0 && Math.floor(e.flashTimer / 60) % 2 === 0) continue;

      if (e.kind === "enemy" && e.hp > 0) {
        const sprite = Sprites.enemySprite(e.enemyType || "goblin");
        ctx.drawImage(sprite, e.frame * T, 0, T, T, dx, dy, T, T);

        // HP bar above enemy
        const hpPct = e.hp / e.maxHp;
        ctx.fillStyle = "#333";
        ctx.fillRect(dx + 4, dy - 6, 24, 4);
        ctx.fillStyle = hpPct > 0.5 ? "#4a4" : hpPct > 0.25 ? "#ca4" : "#c44";
        ctx.fillRect(dx + 4, dy - 6, 24 * hpPct, 4);
        // Name
        ctx.fillStyle = "#fff";
        ctx.font = "7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.name, dx + T / 2, dy - 9);
        ctx.textAlign = "left";
      } else if (e.kind === "npc") {
        const sprite = Sprites.npcSprite(e.npcType || "default", e.colorHue);
        ctx.drawImage(sprite, e.frame * T, 0, T, T, dx, dy, T, T);
        // Name above
        ctx.fillStyle = "#ffd700";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.name, dx + T / 2, dy - 4);
        ctx.textAlign = "left";
      } else if (e.kind === "item") {
        const sprite = Sprites.item(e.itemType || "gold");
        const bob = Math.sin(Date.now() / 300) * 2;
        ctx.drawImage(sprite, dx + 8, dy + 6 + bob);
      }
    }

    // Draw particles
    for (const p of particles) {
      const px = Math.round(p.x - cam.x);
      const py = Math.round(p.y - cam.y);
      const alpha = Math.min(1, p.life / 300);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(px, py, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Draw floating text
    for (const ft of floatingTexts) {
      const fx = Math.round(ft.x - cam.x);
      const fy = Math.round(ft.y - cam.y);
      const alpha = Math.min(1, ft.life / 400);
      ctx.globalAlpha = alpha;
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(ft.text, fx + 1, fy + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
      ctx.textAlign = "left";
    }
    ctx.globalAlpha = 1;
  }

  function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        color: color || "#ffd700",
        size: 2 + Math.random() * 2,
        life: 300 + Math.random() * 300,
      });
    }
  }

  function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color: color || "#fff", life: 1000 });
  }

  return {
    clear, add, remove, getAll, getEnemies, getNPCs, getItems,
    getAt, getEnemiesInBox, update, draw, spawnParticles, addFloatingText,
  };
})();
