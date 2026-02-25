/* ═══════════════════════════════════════════
   save.js — localStorage persistence (3 slots)
   Now includes equipment, achievements, NPCs,
   journal, events data
   ═══════════════════════════════════════════ */

const Save = (() => {
  const SLOT_PREFIX = "ogt_save_";
  const MAX_SLOTS = 3;

  function _key(slot) { return SLOT_PREFIX + slot; }

  function save(slot, data) {
    const payload = {
      version: 3,
      timestamp: Date.now(),
      player: data.player,
      conversationHistory: data.conversationHistory,
      mapData: data.mapData,
      turnCount: data.turnCount,
      npcData: data.npcData,
      journalData: data.journalData,
      eventsData: data.eventsData,
      worldMemory: data.worldMemory,
    };
    try {
      localStorage.setItem(_key(slot), JSON.stringify(payload));
      return true;
    } catch (e) { console.error("Save failed:", e); return false; }
  }

  function load(slot) {
    try {
      const raw = localStorage.getItem(_key(slot));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { console.error("Load failed:", e); return null; }
  }

  function remove(slot) { localStorage.removeItem(_key(slot)); }

  function listSlots() {
    const slots = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const data = load(i);
      if (data) {
        slots.push({
          slot: i, name: data.player?.name || "Unknown",
          level: data.player?.level || 1, race: data.player?.race || "?",
          class: data.player?.class || "?", timestamp: data.timestamp,
          date: new Date(data.timestamp).toLocaleString(),
          permadeath: data.player?.permadeath || false,
          dungeonFloor: data.player?.dungeonFloor || 0,
        });
      } else {
        slots.push({ slot: i, empty: true });
      }
    }
    return slots;
  }

  function autoSave(state) { return save(0, state); }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem("ogt_settings") || "{}"); } catch { return {}; }
  }

  function saveSettings(settings) {
    localStorage.setItem("ogt_settings", JSON.stringify(settings));
  }

  return { save, load, remove, listSlots, autoSave, getSettings, saveSettings, MAX_SLOTS };
})();
