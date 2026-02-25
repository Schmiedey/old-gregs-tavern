/* ═══════════════════════════════════════════
   npcs.js — NPC memory & relationship system
   Tracks all NPCs met, with dispositions
   ═══════════════════════════════════════════ */

const NPCs = (() => {
  const DISPOSITIONS = ["hostile", "unfriendly", "neutral", "friendly", "allied"];
  const DISP_ICONS = { hostile: "💀", unfriendly: "😠", neutral: "😐", friendly: "😊", allied: "💛" };
  const DISP_COLORS = { hostile: "#c44", unfriendly: "#c84", neutral: "#888", friendly: "#5a5", allied: "#ffd700" };

  let registry = {};

  function init() { registry = {}; }

  function add(name, data = {}) {
    if (registry[name]) {
      // Update existing
      Object.assign(registry[name], data, { lastSeen: data.lastSeen || registry[name].lastSeen });
      return;
    }
    registry[name] = {
      name,
      race: data.race || "Unknown",
      role: data.role || "Unknown",
      disposition: data.disposition || "neutral",
      notes: data.notes || [],
      lastSeen: data.lastSeen || "Unknown",
      meetCount: 1,
      firstMet: Date.now(),
    };
  }

  function updateDisposition(name, disposition) {
    if (!registry[name]) return;
    if (DISPOSITIONS.includes(disposition)) {
      registry[name].disposition = disposition;
    }
  }

  function shiftDisposition(name, delta) {
    if (!registry[name]) return;
    const current = DISPOSITIONS.indexOf(registry[name].disposition);
    const next = Math.max(0, Math.min(DISPOSITIONS.length - 1, current + delta));
    registry[name].disposition = DISPOSITIONS[next];
  }

  function addNote(name, note) {
    if (!registry[name]) return;
    registry[name].notes.push(note);
    if (registry[name].notes.length > 10) registry[name].notes.shift();
  }

  function met(name) {
    if (registry[name]) registry[name].meetCount++;
  }

  function get(name) { return registry[name] || null; }
  function getAll() { return Object.values(registry); }
  function count() { return Object.keys(registry).length; }

  function getSummary() {
    const npcs = getAll();
    if (npcs.length === 0) return "No NPCs met yet.";
    return npcs.map((n) =>
      `${DISP_ICONS[n.disposition] || "😐"} ${n.name} (${n.race} ${n.role}) — ${n.disposition}`
    ).join("\n");
  }

  function getForAI() {
    return getAll().map((n) =>
      `${n.name}(${n.disposition},${n.role},met:${n.meetCount})`
    ).join(", ") || "none";
  }

  function parseNPCBlock(data) {
    if (!data.name) return;
    add(data.name, {
      race: data.race,
      role: data.role,
      disposition: data.disposition || "neutral",
      lastSeen: data.location || "Unknown",
    });
  }

  function render(container) {
    container.innerHTML = "";
    const npcs = getAll();
    if (npcs.length === 0) {
      container.innerHTML = '<div class="npc-empty">No NPCs encountered yet.</div>';
      return;
    }

    npcs.sort((a, b) => DISPOSITIONS.indexOf(b.disposition) - DISPOSITIONS.indexOf(a.disposition));

    for (const npc of npcs) {
      const div = document.createElement("div");
      div.className = "npc-card";
      div.style.borderColor = DISP_COLORS[npc.disposition] || "#888";
      div.innerHTML = `
        <div class="npc-header">
          <span class="npc-icon">${DISP_ICONS[npc.disposition] || "😐"}</span>
          <strong>${npc.name}</strong>
          <span class="npc-disp" style="color:${DISP_COLORS[npc.disposition]}">${npc.disposition}</span>
        </div>
        <div class="npc-details">${npc.race} ${npc.role} · Met ${npc.meetCount}x · Last: ${npc.lastSeen}</div>
        ${npc.notes.length > 0 ? `<div class="npc-notes">${npc.notes.slice(-3).join(" · ")}</div>` : ""}
      `;
      container.appendChild(div);
    }
  }

  function getData() { return registry; }
  function restore(data) { registry = data || {}; }

  return { init, add, updateDisposition, shiftDisposition, addNote, met, get, getAll, count, getSummary, getForAI, parseNPCBlock, render, getData, restore };
})();
