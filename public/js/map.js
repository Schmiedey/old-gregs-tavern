/* ═══════════════════════════════════════════
   map.js — Visual canvas-based node map
   ═══════════════════════════════════════════ */

const GameMap = (() => {
  const TYPE_ICONS = {
    tavern: "🍺", wilderness: "🌲", cave: "🕳️", dungeon: "💀",
    town: "🏘️", castle: "🏰", road: "🛤️", mountain: "⛰️",
    swamp: "🐊", temple: "⛪", ruins: "🏚️", camp: "🏕️", unknown: "❓",
  };
  const TYPE_COLORS = {
    tavern: "#d4a745", wilderness: "#5a5", cave: "#888", dungeon: "#c44",
    town: "#58c", castle: "#a6d", road: "#999", mountain: "#8b7355",
    swamp: "#5a7a4a", temple: "#ffd700", ruins: "#666", camp: "#c84", unknown: "#555",
  };

  let locations = {};
  let current = "Old Greg's Tavern";

  function init() {
    locations = { "Old Greg's Tavern": { type: "tavern", connections: [], visited: true, x: 0, y: 0 } };
    current = "Old Greg's Tavern";
  }

  function addLocation(name, type = "unknown", connections = []) {
    if (!locations[name]) {
      // Position new nodes relative to connected nodes
      let x = 0, y = 0;
      const connected = connections.filter((c) => locations[c]);
      if (connected.length > 0) {
        const ref = locations[connected[0]];
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 60;
        x = ref.x + Math.cos(angle) * dist;
        y = ref.y + Math.sin(angle) * dist;
      } else if (locations[current]) {
        const ref = locations[current];
        const angle = Math.random() * Math.PI * 2;
        x = ref.x + Math.cos(angle) * 140;
        y = ref.y + Math.sin(angle) * 140;
      }
      locations[name] = { type, connections: [], visited: false, x, y };
    }
    locations[name].type = type || locations[name].type;

    for (const conn of connections) {
      if (!locations[name].connections.includes(conn)) locations[name].connections.push(conn);
      if (!locations[conn]) {
        const ref = locations[name];
        const angle = Math.random() * Math.PI * 2;
        locations[conn] = { type: "unknown", connections: [], visited: false, x: ref.x + Math.cos(angle) * 130, y: ref.y + Math.sin(angle) * 130 };
      }
      if (!locations[conn].connections.includes(name)) locations[conn].connections.push(name);
    }
  }

  function moveTo(name) {
    if (!locations[name]) addLocation(name, "unknown", [current]);
    if (current && locations[current] && !locations[current].connections.includes(name)) {
      locations[current].connections.push(name);
      if (!locations[name].connections.includes(current)) locations[name].connections.push(current);
    }
    current = name;
    locations[name].visited = true;
  }

  function getCurrent() { return current; }
  function getCurrentType() { return locations[current]?.type || "unknown"; }
  function getData() { return { locations, current }; }
  function restore(data) { if (data) { locations = data.locations || {}; current = data.current || "Old Greg's Tavern"; } }
  function getLocationCount() { return Object.values(locations).filter((l) => l.visited).length; }

  function render(container) {
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "map-canvas-wrap";

    const canvas = document.createElement("canvas");
    canvas.className = "map-canvas";
    canvas.width = 500;
    canvas.height = 400;
    wrapper.appendChild(canvas);

    const legend = document.createElement("div");
    legend.className = "map-legend";
    legend.innerHTML = `📍 <strong>${current}</strong> — ${TYPE_ICONS[locations[current]?.type] || "❓"} ${locations[current]?.type || "unknown"}`;
    wrapper.appendChild(legend);

    container.appendChild(wrapper);

    const ctx = canvas.getContext("2d");
    drawMap(ctx, canvas.width, canvas.height);
  }

  function drawMap(ctx, w, h) {
    const entries = Object.entries(locations);
    if (entries.length === 0) return;

    // Calculate bounds and center
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [, loc] of entries) {
      minX = Math.min(minX, loc.x); maxX = Math.max(maxX, loc.x);
      minY = Math.min(minY, loc.y); maxY = Math.max(maxY, loc.y);
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pad = 50;
    const sx = (x) => pad + ((x - minX) / rangeX) * (w - pad * 2);
    const sy = (y) => pad + ((y - minY) / rangeY) * (h - pad * 2);

    // Draw connections
    ctx.lineWidth = 2;
    const drawn = new Set();
    for (const [name, loc] of entries) {
      for (const conn of loc.connections) {
        const key = [name, conn].sort().join("|");
        if (drawn.has(key)) continue;
        drawn.add(key);
        const target = locations[conn];
        if (!target) continue;
        ctx.strokeStyle = (loc.visited && target.visited) ? "rgba(212,167,69,0.5)" : "rgba(100,100,100,0.3)";
        ctx.setLineDash(loc.visited && target.visited ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(sx(loc.x), sy(loc.y));
        ctx.lineTo(sx(target.x), sy(target.y));
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Draw nodes
    for (const [name, loc] of entries) {
      const x = sx(loc.x);
      const y = sy(loc.y);
      const color = TYPE_COLORS[loc.type] || "#555";
      const isCurrent = name === current;
      const r = isCurrent ? 20 : 14;

      // Glow for current
      if (isCurrent) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
      }

      ctx.fillStyle = loc.visited ? color : "#333";
      ctx.strokeStyle = isCurrent ? "#ffd700" : (loc.visited ? color : "#555");
      ctx.lineWidth = isCurrent ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Icon
      ctx.font = `${isCurrent ? 16 : 12}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(TYPE_ICONS[loc.type] || "❓", x, y);

      // Label
      ctx.font = `${isCurrent ? "bold " : ""}10px 'Crimson Text', serif`;
      ctx.fillStyle = loc.visited ? "#d4d0c8" : "#666";
      ctx.fillText(name.length > 16 ? name.slice(0, 14) + "…" : name, x, y + r + 12);
    }
  }

  return { init, addLocation, moveTo, getCurrent, getCurrentType, getData, restore, render, getLocationCount, TYPE_ICONS };
})();
