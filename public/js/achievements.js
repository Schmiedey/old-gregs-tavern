/* ═══════════════════════════════════════════
   achievements.js — Achievement tracking system
   Stores in localStorage, toast notifications
   ═══════════════════════════════════════════ */

const Achievements = (() => {
  const STORAGE_KEY = "ogt_achievements";

  const DEFS = [
    { id: "first_blood",    name: "First Blood",       desc: "Win your first combat",         icon: "🗡️" },
    { id: "tavern_regular", name: "Tavern Regular",     desc: "Return to Old Greg's Tavern 3 times", icon: "🍺" },
    { id: "dragon_slayer",  name: "Dragon Slayer",      desc: "Defeat a dragon",               icon: "🐉" },
    { id: "rich",           name: "Gold Hoarder",       desc: "Accumulate 500+ gold",          icon: "💰" },
    { id: "level5",         name: "Seasoned Adventurer", desc: "Reach level 5",                icon: "⬆️" },
    { id: "level10",        name: "Legendary Hero",     desc: "Reach level 10",                icon: "🌟" },
    { id: "explorer",       name: "Explorer",           desc: "Visit 10 different locations",  icon: "🗺️" },
    { id: "social",         name: "Social Butterfly",   desc: "Meet 10 NPCs",                  icon: "🤝" },
    { id: "lore_master",    name: "Lore Master",        desc: "Collect 10 lore entries",       icon: "📚" },
    { id: "quest_five",     name: "Questologist",       desc: "Complete 5 quests",             icon: "📜" },
    { id: "crit_master",    name: "Critical Master",    desc: "Roll 5 natural 20s",            icon: "🎯" },
    { id: "survivor",       name: "Survivor",           desc: "Win a fight with ≤ 3 HP",       icon: "💪" },
    { id: "shopaholic",     name: "Shopaholic",         desc: "Buy 20 items",                  icon: "🛒" },
    { id: "dungeon_clear",  name: "Dungeon Crawler",    desc: "Complete a dungeon delve",      icon: "💀" },
    { id: "permadeath_win", name: "Iron Will",          desc: "Reach level 5 in permadeath",   icon: "☠️" },
    { id: "pacifist",       name: "Pacifist",           desc: "Resolve 3 encounters without combat", icon: "🕊️" },
    { id: "dice_roller",    name: "Dice Addict",        desc: "Roll 50 dice manually",         icon: "🎲" },
    { id: "fully_equipped", name: "Geared Up",          desc: "Fill all 5 equipment slots",    icon: "🛡️" },
    { id: "night_owl",      name: "Night Owl",          desc: "Play for 30+ minutes",          icon: "🦉" },
    { id: "storyteller",    name: "Storyteller",        desc: "Take 100 actions",              icon: "📖" },
  ];

  let unlocked = {};
  let counters = {};
  let onUnlockCallback = null;

  function init() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      unlocked = saved.unlocked || {};
      counters = saved.counters || {};
    } catch {
      unlocked = {};
      counters = {};
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked, counters }));
  }

  function onUnlock(cb) { onUnlockCallback = cb; }

  function unlock(id) {
    if (unlocked[id]) return false;
    const def = DEFS.find((d) => d.id === id);
    if (!def) return false;

    unlocked[id] = Date.now();
    save();

    if (onUnlockCallback) onUnlockCallback(def);
    showToast(def);
    return true;
  }

  function increment(counter, amount = 1) {
    counters[counter] = (counters[counter] || 0) + amount;
    save();
    return counters[counter];
  }

  function getCounter(counter) { return counters[counter] || 0; }

  function isUnlocked(id) { return !!unlocked[id]; }

  function getProgress() {
    return { unlocked: Object.keys(unlocked).length, total: DEFS.length };
  }

  function checkAll(player, context = {}) {
    if (context.combatWon) {
      increment("combats_won");
      if (getCounter("combats_won") === 1) unlock("first_blood");
      if (player.hp <= 3) unlock("survivor");
      if (context.enemyName?.toLowerCase().includes("dragon")) unlock("dragon_slayer");
    }

    if (player.gold >= 500) unlock("rich");
    if (player.level >= 5) unlock("level5");
    if (player.level >= 10) unlock("level10");
    if (player.level >= 5 && player.permadeath) unlock("permadeath_win");

    if (context.locationCount >= 10) unlock("explorer");
    if (context.npcCount >= 10) unlock("social");
    if (context.loreCount >= 10) unlock("lore_master");
    if (context.questsCompleted >= 5) unlock("quest_five");
    if (context.nat20Count >= 5) unlock("crit_master");

    if (getCounter("items_bought") >= 20) unlock("shopaholic");
    if (getCounter("dice_manual") >= 50) unlock("dice_roller");
    if (player.turnCount >= 100) unlock("storyteller");

    if (player.equipment) {
      const allFilled = Object.values(player.equipment).every((v) => v !== null);
      if (allFilled) unlock("fully_equipped");
    }

    // Night owl: check if session is 30+ minutes
    if (context.sessionStart && Date.now() - context.sessionStart > 30 * 60 * 1000) {
      unlock("night_owl");
    }
  }

  function showToast(def) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = `
      <div class="achievement-toast-icon">${def.icon}</div>
      <div class="achievement-toast-text">
        <div class="achievement-toast-title">🏆 Achievement Unlocked!</div>
        <div class="achievement-toast-name">${def.name}</div>
        <div class="achievement-toast-desc">${def.desc}</div>
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  function render(container) {
    container.innerHTML = "";
    const { unlocked: u, total } = getProgress();

    const header = document.createElement("div");
    header.className = "achievements-header";
    header.innerHTML = `🏆 Achievements: <strong>${u}/${total}</strong>`;
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "achievements-grid";

    for (const def of DEFS) {
      const div = document.createElement("div");
      div.className = "achievement-card" + (unlocked[def.id] ? " unlocked" : " locked");
      div.innerHTML = `
        <div class="achievement-icon">${unlocked[def.id] ? def.icon : "🔒"}</div>
        <div class="achievement-name">${def.name}</div>
        <div class="achievement-desc">${unlocked[def.id] ? def.desc : "???"}</div>
      `;
      grid.appendChild(div);
    }

    container.appendChild(grid);
  }

  return { init, onUnlock, unlock, increment, getCounter, isUnlocked, getProgress, checkAll, render, DEFS };
})();
