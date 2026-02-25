/* ═══════════════════════════════════════════
   camera.js — 2D camera with smooth follow
   ═══════════════════════════════════════════ */

const Camera = (() => {
  let x = 0, y = 0;
  let targetX = 0, targetY = 0;
  let w = 800, h = 600;
  const LERP = 0.08;
  let shake = 0;
  let shakeX = 0, shakeY = 0;

  function resize(width, height) {
    w = width;
    h = height;
  }

  function follow(px, py) {
    targetX = px - w / 2;
    targetY = py - h / 2;
  }

  function update() {
    x += (targetX - x) * LERP;
    y += (targetY - y) * LERP;

    // Clamp to map bounds
    const mapW = TileMap.getPixelWidth();
    const mapH = TileMap.getPixelHeight();
    if (mapW > w) {
      x = Math.max(0, Math.min(x, mapW - w));
    } else {
      x = (mapW - w) / 2;
    }
    if (mapH > h) {
      y = Math.max(0, Math.min(y, mapH - h));
    } else {
      y = (mapH - h) / 2;
    }

    // Shake
    if (shake > 0) {
      shakeX = (Math.random() - 0.5) * shake * 2;
      shakeY = (Math.random() - 0.5) * shake * 2;
      shake *= 0.85;
      if (shake < 0.5) { shake = 0; shakeX = 0; shakeY = 0; }
    }
  }

  function addShake(intensity) {
    shake = Math.max(shake, intensity);
  }

  function getView() {
    return {
      x: Math.round(x + shakeX),
      y: Math.round(y + shakeY),
      w, h,
    };
  }

  function snapTo(px, py) {
    x = targetX = px - w / 2;
    y = targetY = py - h / 2;
  }

  return { resize, setSize: resize, follow, update, addShake, getView, snapTo };
})();
