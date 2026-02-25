/* ═══════════════════════════════════════════
   map.js — Explored location tracker & renderer
   ═══════════════════════════════════════════ */

const GameMap = (() => {
  const TYPE_ICONS = {
    tavern: "🍺", wilderness: "🌲", cave: "🕳️", dungeon: "💀",
    town: "🏘️", castle: "🏰", road: "🛤️", mountain: "⛰️",
    swamp: "🐊", temple: "⛪", ruins: "🏚️", camp: "🏕️",
    unknown: "❓",
  };

  let locations = {};
  let current = "Old Greg's Tavern";

  function init() {
    locations = {
      "Old Greg's Tavern": { type: "tavern", connections: [], visited: true },
    };
    current = "Old Greg's Tavern";
  }

  function addLocation(name, type = "unknown", connections = []) {
    if (!locations[name]) {
      locations[name] = { type, connections: [], visited: false };
    }
    locations[name].type = type || locations[name].type;

    // Add connections bidirectionally
    for (const conn of connections) {
      if (!locations[name].connections.includes(conn)) {
        locations[name].connections.push(conn);
      }
      if (!locations[conn]) {
        locations[conn] = { type: "unknown", connections: [], visited: false };
      }
      if (!locations[conn].connections.includes(name)) {
        locations[conn].connections.push(name);
      }
    }
  }

  function moveTo(name) {
    if (!locations[name]) {
      addLocation(name, "unknown", [current]);
    }
    // Ensure connection from current
    if (current && locations[current] && !locations[current].connections.includes(name)) {
      locations[current].connections.push(name);
      if (!locations[name].connections.includes(current)) {
        locations[name].connections.push(current);
      }
    }
    current = name;
    locations[name].visited = true;
  }

  function getCurrent() { return current; }

  function getData() { return { locations, current }; }

  function restore(data) {
    if (data) {
      locations = data.locations || {};
      current = data.current || "Old Greg's Tavern";
    }
  }

  /**
   * Render map into a container element
   */
  function render(container) {
    container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "map-current";
    header.innerHTML = `📍 <strong>${current}</strong>`;
    container.appendChild(header);

    const list = document.createElement("div");
    list.className = "map-locations";

    // Sort: current first, then visited, then unvisited
    const sorted = Object.entries(locations).sort(([aName, a], [bName, b]) => {
      if (aName === current) return -1;
      if (bName === current) return 1;
      if (a.visited && !b.visited) return -1;
      if (!a.visited && b.visited) return 1;
      return aName.localeCompare(bName);
    });

    for (const [name, loc] of sorted) {
      const node = document.createElement("div");
      node.className = "map-node" + (name === current ? " current" : "") + (loc.visited ? " visited" : " unvisited");
      const icon = TYPE_ICONS[loc.type] || TYPE_ICONS.unknown;
      const conns = loc.connections.length > 0
        ? loc.connections.map((c) => `<span class="map-conn ${locations[c]?.visited ? "visited" : ""}">${c}</span>`).join(", ")
        : "<em>no known paths</em>";
      node.innerHTML = `
        <div class="map-node-header">${icon} <strong>${name}</strong>${!loc.visited ? ' <span class="unexplored">(unexplored)</span>' : ""}</div>
        <div class="map-node-conns">→ ${conns}</div>
      `;
      list.appendChild(node);
    }
    container.appendChild(list);
  }

  function getLocationCount() {
    return Object.keys(locations).length;
  }

  return { init, addLocation, moveTo, getCurrent, getData, restore, render, getLocationCount };
})();
