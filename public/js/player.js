/* ═══════════════════════════════════════════
   player.js — Player entity with 2D movement,
   animation, collision, interaction
   ═══════════════════════════════════════════ */

const Player = (() => {
  const T = Sprites.TILE;
  const SPEED = 2.5;
  const HITBOX = { w: 14, h: 10, offX: 9, offY: 20 }; // collision box relative to sprite

  let x = 0, y = 0;  // pixel position
  let dir = 0;        // 0=down, 1=left, 2=right, 3=up
  let frame = 0;
  let animTimer = 0;
  let moving = false;
  let spriteSheet = null;
  let attackTimer = 0;
  let attackDir = 0;
  let invincibleTimer = 0;
  let interacting = false;

  function init(race, charClass, spawnTile) {
    x = spawnTile.x * T;
    y = spawnTile.y * T;
    dir = 0;
    frame = 0;
    spriteSheet = Sprites.playerSheet(race, charClass);
  }

  function update(dt) {
    if (attackTimer > 0) {
      attackTimer -= dt;
      return;
    }
    if (invincibleTimer > 0) invincibleTimer -= dt;

    const input = Input.getDirection();
    moving = input.dx !== 0 || input.dy !== 0;

    if (moving && !Dialogue.isOpen() && !Combat2D.isPaused()) {
      // Update direction
      if (input.dy < 0) dir = 3;
      else if (input.dy > 0) dir = 0;
      if (input.dx < 0) dir = 1;
      else if (input.dx > 0) dir = 2;

      // Normalize diagonal
      let mx = input.dx * SPEED;
      let my = input.dy * SPEED;
      if (input.dx !== 0 && input.dy !== 0) {
        mx *= 0.707;
        my *= 0.707;
      }

      // X movement
      const newX = x + mx;
      if (!TileMap.checkCollision(newX + HITBOX.offX, y + HITBOX.offY, HITBOX.w, HITBOX.h)) {
        x = newX;
      }

      // Y movement
      const newY = y + my;
      if (!TileMap.checkCollision(x + HITBOX.offX, newY + HITBOX.offY, HITBOX.w, HITBOX.h)) {
        y = newY;
      }

      // Animation
      animTimer += dt;
      if (animTimer > 200) {
        frame = (frame + 1) % 2;
        animTimer = 0;
      }
    } else {
      frame = 0;
      animTimer = 0;
    }
  }

  function attack() {
    if (attackTimer > 0) return false;
    attackTimer = 300;
    attackDir = dir;
    Sound.swordHit();
    return true;
  }

  function takeDamage(amt) {
    if (invincibleTimer > 0) return false;
    invincibleTimer = 800;
    Camera.addShake(6);
    Sound.hit();
    return true;
  }

  function draw(ctx, cam) {
    if (!spriteSheet) return;
    const sx = frame * T;
    const sy = dir * T;
    const dx = Math.round(x - cam.x);
    const dy = Math.round(y - cam.y);

    // Invincibility flash
    if (invincibleTimer > 0 && Math.floor(invincibleTimer / 80) % 2 === 0) return;

    ctx.drawImage(spriteSheet, sx, sy, T, T, dx, dy, T, T);

    // Attack slash effect
    if (attackTimer > 0) {
      const slashFrame = Math.floor((300 - attackTimer) / 75);
      const slashSprite = Sprites.slash(slashFrame);
      let slashX = dx, slashY = dy;
      if (attackDir === 0) slashY += T;
      else if (attackDir === 3) slashY -= T;
      else if (attackDir === 1) slashX -= T;
      else if (attackDir === 2) slashX += T;
      ctx.drawImage(slashSprite, slashX, slashY);
    }

    // Interaction prompt
    const near = getNearbyInteractable();
    if (near && !Dialogue.isOpen()) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(dx - 10, dy - 14, 52, 14);
      ctx.fillStyle = "#ffd700";
      ctx.font = "9px 'Press Start 2P'";
      ctx.textAlign = "center";
      ctx.fillText("[E]", dx + 16, dy - 4);
      ctx.textAlign = "left";
    }
  }

  function getCenter() {
    return { x: x + T / 2, y: y + T / 2 };
  }

  function getTilePos() {
    return { x: Math.floor((x + T / 2) / T), y: Math.floor((y + T / 2) / T) };
  }

  function getFacingTile() {
    const t = getTilePos();
    if (dir === 0) return { x: t.x, y: t.y + 1 };
    if (dir === 3) return { x: t.x, y: t.y - 1 };
    if (dir === 1) return { x: t.x - 1, y: t.y };
    if (dir === 2) return { x: t.x + 1, y: t.y };
    return t;
  }

  function getAttackBox() {
    const c = getCenter();
    const range = T * 1.2;
    if (attackDir === 0) return { x: c.x - 12, y: c.y, w: 24, h: range };
    if (attackDir === 3) return { x: c.x - 12, y: c.y - range, w: 24, h: range };
    if (attackDir === 1) return { x: c.x - range, y: c.y - 12, w: range, h: 24 };
    if (attackDir === 2) return { x: c.x, y: c.y - 12, w: range, h: 24 };
    return { x: c.x - 12, y: c.y, w: 24, h: 24 };
  }

  function getPos() { return { x, y }; }
  function setPos(nx, ny) { x = nx; y = ny; }
  function respawn(spawnTile) {
    x = spawnTile.x * T;
    y = spawnTile.y * T;
    dir = 0; frame = 0;
    attackTimer = 0; invincibleTimer = 0;
  }
  function getDir() { return dir; }
  function isAttacking() { return attackTimer > 0; }
  function isInvincible() { return invincibleTimer > 0; }

  function getNearbyInteractable() {
    const facing = getFacingTile();
    // Check NPCs
    const ent = Entities.getAt(facing.x * T, facing.y * T, T);
    if (ent) return ent;
    // Check tile interactions
    const tileInt = TileMap.getInteraction(facing.x, facing.y);
    if (tileInt) return { type: tileInt, tileX: facing.x, tileY: facing.y };
    return null;
  }

  return {
    init, update, attack, takeDamage, draw, respawn, getCenter, getTilePos,
    getFacingTile, getAttackBox, getPos, setPos, getDir, isAttacking,
    isInvincible, getNearbyInteractable, HITBOX,
  };
})();
