/* ═══════════════════════════════════════════
   tilemap.js — Tile-based map system
   Defines room layouts, collision, transitions
   ═══════════════════════════════════════════ */

const TileMap = (() => {
  const T = Sprites.TILE;
  let currentMap = null;
  let width = 0;
  let height = 0;

  // Tile properties
  const TILE_PROPS = {
    grass: { solid: false }, grass2: { solid: false }, dirt: { solid: false },
    path: { solid: false }, stone: { solid: false }, wood: { solid: false },
    water: { solid: true }, wall: { solid: true }, wall_dark: { solid: true },
    door: { solid: false, transition: true }, tavern_floor: { solid: false },
    bar: { solid: true }, table: { solid: true }, chair: { solid: false },
    tree: { solid: true }, bush: { solid: true }, chest: { solid: false, interact: "chest" },
    stairs_down: { solid: false, transition: true }, stairs_up: { solid: false, transition: true },
    lava: { solid: true, damage: true }, carpet: { solid: false }, void: { solid: true },
  };

  function load(mapData) {
    currentMap = mapData;
    width = mapData.tiles[0].length;
    height = mapData.tiles.length;
  }

  function getTile(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return "void";
    return currentMap.tiles[y][x];
  }

  function isSolid(x, y) {
    const tile = getTile(x, y);
    return TILE_PROPS[tile]?.solid ?? true;
  }

  function isTransition(x, y) {
    const tile = getTile(x, y);
    return TILE_PROPS[tile]?.transition || false;
  }

  function getInteraction(x, y) {
    const tile = getTile(x, y);
    return TILE_PROPS[tile]?.interact || null;
  }

  // Check collision for pixel coordinates
  function checkCollision(px, py, w, h) {
    const left = Math.floor(px / T);
    const right = Math.floor((px + w - 1) / T);
    const top = Math.floor(py / T);
    const bottom = Math.floor((py + h - 1) / T);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (isSolid(tx, ty)) return true;
      }
    }
    return false;
  }

  function findTransition(px, py) {
    const tx = Math.floor(px / T);
    const ty = Math.floor(py / T);
    if (!currentMap.transitions) return null;
    return currentMap.transitions.find(t => t.x === tx && t.y === ty) || null;
  }

  function getSpawnPoint() {
    return currentMap.spawn || { x: 3, y: 3 };
  }

  function getWidth() { return width; }
  function getHeight() { return height; }
  function getPixelWidth() { return width * T; }
  function getPixelHeight() { return height * T; }
  function getCurrentMap() { return currentMap; }

  function draw(ctx, camera) {
    const startX = Math.max(0, Math.floor(camera.x / T));
    const startY = Math.max(0, Math.floor(camera.y / T));
    const endX = Math.min(width, Math.ceil((camera.x + camera.w) / T) + 1);
    const endY = Math.min(height, Math.ceil((camera.y + camera.h) / T) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tileType = getTile(x, y);
        const sprite = Sprites.tile(tileType);
        ctx.drawImage(sprite, x * T - camera.x, y * T - camera.y);
      }
    }
  }

  return {
    load, getTile, isSolid, isTransition, checkCollision, findTransition,
    getSpawnPoint, getWidth, getHeight, getPixelWidth, getPixelHeight,
    getCurrentMap, draw, getInteraction, TILE_PROPS,
  };
})();
