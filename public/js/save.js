/* ═══════════════════════════════════════════
   save.js — localStorage persistence (3 slots)
   ═══════════════════════════════════════════ */

const Save = (() => {
  const SLOT_PREFIX = "ogt_save_";
  const MAX_SLOTS = 3;

  function _key(slot) { return SLOT_PREFIX + slot; }

  /**
   * Save full game state to a slot (0-2)
   */
  function save(slot, { player, conversationHistory, mapData, turnCount }) {
    const data = {
      version: 2,
      timestamp: Date.now(),
      player,
      conversationHistory,
      mapData,
      turnCount,
    };
    try {
      localStorage.setItem(_key(slot), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Save failed:", e);
      return false;
    }
  }

  /**
   * Load game state from a slot
   */
  function load(slot) {
    try {
      const raw = localStorage.getItem(_key(slot));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Load failed:", e);
      return null;
    }
  }

  /**
   * Delete a save slot
   */
  function remove(slot) {
    localStorage.removeItem(_key(slot));
  }

  /**
   * Get metadata for all slots (for save/load UI)
   */
  function listSlots() {
    const slots = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const data = load(i);
      if (data) {
        slots.push({
          slot: i,
          name: data.player?.name || "Unknown",
          level: data.player?.level || 1,
          race: data.player?.race || "?",
          class: data.player?.class || "?",
          timestamp: data.timestamp,
          date: new Date(data.timestamp).toLocaleString(),
        });
      } else {
        slots.push({ slot: i, empty: true });
      }
    }
    return slots;
  }

  /**
   * Auto-save to slot 0
   */
  function autoSave(state) {
    return save(0, state);
  }

  /**
   * Store/retrieve settings (API key, model, sound, etc.)
   */
  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem("ogt_settings") || "{}");
    } catch { return {}; }
  }

  function saveSettings(settings) {
    localStorage.setItem("ogt_settings", JSON.stringify(settings));
  }

  return { save, load, remove, listSlots, autoSave, getSettings, saveSettings, MAX_SLOTS };
})();
