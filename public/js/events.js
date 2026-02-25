/* ═══════════════════════════════════════════
   events.js — Random events & world events
   Ambushes, merchants, weather, discoveries
   ═══════════════════════════════════════════ */

const Events = (() => {
  const EVENT_TABLE = [
    { id: "ambush",       weight: 15, type: "combat",    text: "Bandits leap from the shadows!", minLevel: 1 },
    { id: "wolf_pack",    weight: 10, type: "combat",    text: "A pack of wolves circles you!",  minLevel: 2 },
    { id: "wanderer",     weight: 20, type: "npc",       text: "A hooded traveler approaches.", minLevel: 1 },
    { id: "merchant",     weight: 15, type: "shop",      text: "A wandering merchant appears!",  minLevel: 1 },
    { id: "storm",        weight: 10, type: "weather",   text: "A sudden storm rolls in.",       minLevel: 1 },
    { id: "treasure",     weight: 8,  type: "loot",      text: "You spot something glinting!",   minLevel: 1 },
    { id: "shrine",       weight: 8,  type: "heal",      text: "You find a glowing shrine.",     minLevel: 1 },
    { id: "trap",         weight: 10, type: "check",     text: "You trigger a hidden trap!",     minLevel: 2 },
    { id: "earthquake",   weight: 5,  type: "weather",   text: "The ground trembles!",           minLevel: 3 },
    { id: "old_friend",   weight: 5,  type: "npc",       text: "You encounter a familiar face.", minLevel: 3 },
    { id: "cursed_item",  weight: 5,  type: "loot",      text: "A strange artifact calls to you.",minLevel: 4 },
    { id: "portal",       weight: 3,  type: "location",  text: "A shimmering portal appears!",   minLevel: 5 },
  ];

  let lastEventTurn = 0;
  const MIN_TURNS_BETWEEN = 4;
  const BASE_CHANCE = 0.15; // 15% per turn

  function init() { lastEventTurn = 0; }

  function shouldTrigger(turnCount, level) {
    if (turnCount - lastEventTurn < MIN_TURNS_BETWEEN) return false;
    return Math.random() < BASE_CHANCE + (level * 0.01);
  }

  function roll(level) {
    const eligible = EVENT_TABLE.filter((e) => level >= e.minLevel);
    const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * totalWeight;
    for (const e of eligible) {
      r -= e.weight;
      if (r <= 0) return e;
    }
    return eligible[eligible.length - 1];
  }

  function trigger(turnCount, level) {
    if (!shouldTrigger(turnCount, level)) return null;
    lastEventTurn = turnCount;
    return roll(level);
  }

  function getPromptForEvent(event) {
    switch (event.type) {
      case "combat":
        return `[RANDOM EVENT: ${event.text}] Start combat with an appropriate enemy. Use a \`\`\`combat block.`;
      case "npc":
        return `[RANDOM EVENT: ${event.text}] Introduce an interesting NPC with a \`\`\`npc block. Give them a quest or useful info.`;
      case "shop":
        return `[RANDOM EVENT: ${event.text}] Describe a travelling merchant. The player can use the shop.`;
      case "weather":
        return `[RANDOM EVENT: ${event.text}] Describe dramatic weather. Include a \`\`\`check block for an appropriate skill check.`;
      case "loot":
        return `[RANDOM EVENT: ${event.text}] Describe what they find. Include a \`\`\`loot block.`;
      case "heal":
        return `[RANDOM EVENT: ${event.text}] Describe a healing shrine. The player restores some HP and mana.`;
      case "check":
        return `[RANDOM EVENT: ${event.text}] Include a \`\`\`check block with DEX DC 13 to avoid the trap.`;
      case "location":
        return `[RANDOM EVENT: ${event.text}] Describe a portal to a new location. Include a \`\`\`location block.`;
      default:
        return `[RANDOM EVENT: ${event.text}]`;
    }
  }

  function getData() { return { lastEventTurn }; }
  function restore(data) { if (data) lastEventTurn = data.lastEventTurn || 0; }

  return { init, trigger, getPromptForEvent, getData, restore };
})();
