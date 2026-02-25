/* ═══════════════════════════════════════════════
   character.js — Character with mana, skills,
   cooldowns & status effects
   ═══════════════════════════════════════════════ */

const Character = (() => {
  const CLASS_DATA = {
    Warrior: { hpBase: 14, hpPerLvl: 7, manaBase: 4, manaPerLvl: 1, bonusStat: "STR", skills: [
      { name: "Power Attack",  manaCost: 3, cooldown: 2, dmgDice: "1d10", stat: "STR", type: "damage", desc: "A devastating strike" },
      { name: "Shield Bash",   manaCost: 2, cooldown: 2, dmgDice: "1d6",  stat: "STR", type: "stun",   desc: "Stun for 1 turn" },
      { name: "Intimidate",    manaCost: 2, cooldown: 3, dmgDice: "0",    stat: "CHA", type: "debuff", desc: "-2 ATK for 3 turns" },
    ]},
    Mage: { hpBase: 8, hpPerLvl: 4, manaBase: 16, manaPerLvl: 4, bonusStat: "INT", skills: [
      { name: "Fireball",      manaCost: 6, cooldown: 2, dmgDice: "2d6",  stat: "INT", type: "damage", desc: "Hurl fire" },
      { name: "Arcane Shield", manaCost: 4, cooldown: 3, dmgDice: "0",    stat: "INT", type: "buff",   desc: "+3 AC for 3 turns" },
      { name: "Frost Bolt",    manaCost: 4, cooldown: 1, dmgDice: "1d8",  stat: "INT", type: "slow",   desc: "Damage + slow 2 turns" },
    ]},
    Rogue: { hpBase: 10, hpPerLvl: 5, manaBase: 8, manaPerLvl: 2, bonusStat: "DEX", skills: [
      { name: "Sneak Attack",  manaCost: 4, cooldown: 2, dmgDice: "2d6",  stat: "DEX", type: "damage", desc: "Strike from shadows" },
      { name: "Evasion",       manaCost: 3, cooldown: 3, dmgDice: "0",    stat: "DEX", type: "dodge",  desc: "Dodge next attack" },
      { name: "Poison Blade",  manaCost: 4, cooldown: 3, dmgDice: "1d4",  stat: "DEX", type: "poison", desc: "Poison 3 turns" },
    ]},
    Cleric: { hpBase: 10, hpPerLvl: 6, manaBase: 12, manaPerLvl: 3, bonusStat: "WIS", skills: [
      { name: "Heal",          manaCost: 4, cooldown: 1, dmgDice: "0",    stat: "WIS", type: "heal",   desc: "Restore HP" },
      { name: "Smite Undead",  manaCost: 5, cooldown: 2, dmgDice: "2d6",  stat: "WIS", type: "damage", desc: "Holy damage" },
      { name: "Bless",         manaCost: 5, cooldown: 4, dmgDice: "0",    stat: "WIS", type: "buff",   desc: "+2 ATK 3 turns" },
    ]},
    Ranger: { hpBase: 10, hpPerLvl: 5, manaBase: 8, manaPerLvl: 2, bonusStat: "DEX", skills: [
      { name: "Called Shot",   manaCost: 3, cooldown: 2, dmgDice: "1d8",  stat: "DEX", type: "damage", desc: "Precise shot" },
      { name: "Entangle",      manaCost: 4, cooldown: 3, dmgDice: "0",    stat: "WIS", type: "stun",   desc: "Hold 1 turn" },
      { name: "Hunter's Mark", manaCost: 3, cooldown: 3, dmgDice: "0",    stat: "WIS", type: "buff",   desc: "+2 dmg 3 turns" },
    ]},
    Bard: { hpBase: 9, hpPerLvl: 5, manaBase: 10, manaPerLvl: 3, bonusStat: "CHA", skills: [
      { name: "Inspire",       manaCost: 3, cooldown: 2, dmgDice: "0",    stat: "CHA", type: "buff",   desc: "+2 all 2 turns" },
      { name: "Charm",         manaCost: 5, cooldown: 3, dmgDice: "0",    stat: "CHA", type: "stun",   desc: "Skip 1 turn" },
      { name: "Vicious Mockery", manaCost: 2, cooldown: 1, dmgDice: "1d6", stat: "CHA", type: "debuff", desc: "Psychic dmg + -1 ATK" },
    ]},
  };

  const RACE_DATA = {
    Human:    { bonus: { STR: 1, DEX: 1, CON: 1 }, desc: "Versatile — +1 STR/DEX/CON" },
    Elf:      { bonus: { DEX: 2, INT: 1 }, desc: "Graceful — +2 DEX, +1 INT" },
    Dwarf:    { bonus: { CON: 2, STR: 1 }, desc: "Stout — +2 CON, +1 STR" },
    Halfling: { bonus: { DEX: 2, CHA: 1 }, desc: "Lucky — +2 DEX, +1 CHA" },
    Orc:      { bonus: { STR: 2, CON: 1 }, desc: "Fierce — +2 STR, +1 CON" },
    Tiefling: { bonus: { CHA: 2, INT: 1 }, desc: "Cunning — +2 CHA, +1 INT" },
  };

  function create(name, race, charClass, baseStats) {
    const raceBonuses = RACE_DATA[race]?.bonus || {};
    const stats = { ...baseStats };
    for (const [stat, val] of Object.entries(raceBonuses)) stats[stat] = (stats[stat] || 10) + val;

    const cd = CLASS_DATA[charClass];
    const conMod = Dice.modifier(stats.CON);
    const maxHp = cd.hpBase + Math.max(0, conMod);
    const statForMana = cd.bonusStat === "STR" ? "CON" : cd.bonusStat;
    const maxMana = cd.manaBase + Math.max(0, Dice.modifier(stats[statForMana]));

    const skills = cd.skills.map((s) => ({ ...s, currentCooldown: 0 }));

    return {
      name, race, class: charClass,
      level: 1, xp: 0, xpToLevel: 100,
      stats, maxHp, hp: maxHp, maxMana, mana: maxMana,
      ac: 10 + Dice.modifier(stats.DEX),
      gold: 10,
      inventory: ["Torch", getStartingWeapon(charClass), "Health Potion"],
      quests: [], skills,
      statusEffects: [],
      turnCount: 0,
    };
  }

  function getStartingWeapon(cc) {
    return { Warrior: "Iron Longsword", Mage: "Gnarled Staff", Rogue: "Twin Daggers", Cleric: "Holy Mace", Ranger: "Longbow", Bard: "Lute & Rapier" }[cc] || "Rusty Sword";
  }

  function addXp(char, amount) {
    char.xp += amount;
    let leveled = false;
    while (char.xp >= char.xpToLevel) {
      char.xp -= char.xpToLevel;
      char.level++;
      char.xpToLevel = Math.floor(char.xpToLevel * 1.5);
      const cd = CLASS_DATA[char.class];
      char.maxHp += cd.hpPerLvl + Math.max(0, Dice.modifier(char.stats.CON));
      char.maxMana += cd.manaPerLvl;
      char.hp = char.maxHp;
      char.mana = char.maxMana;
      leveled = true;
    }
    return leveled;
  }

  function takeDamage(char, amt) { char.hp = Math.max(0, char.hp - amt); return char.hp <= 0; }
  function heal(char, amt) { char.hp = Math.min(char.maxHp, char.hp + amt); }
  function restoreMana(char, amt) { char.mana = Math.min(char.maxMana, char.mana + amt); }
  function useMana(char, amt) { if (char.mana < amt) return false; char.mana -= amt; return true; }

  function addStatus(char, name, duration) {
    char.statusEffects = char.statusEffects.filter((s) => s.name !== name);
    const templates = {
      Poisoned:  { hpPerTurn: -2, icon: "🤢" },
      Stunned:   { skipTurn: true, icon: "💫" },
      Blessed:   { atkBonus: 2, icon: "✨" },
      Shielded:  { acBonus: 3, icon: "🛡️" },
      Inspired:  { allBonus: 2, icon: "🎵" },
      Slowed:    { atkPenalty: -2, icon: "🐌" },
      Marked:    { dmgBonus: 2, icon: "🎯" },
      Dodging:   { dodge: true, icon: "💨" },
    };
    const t = templates[name];
    if (t) char.statusEffects.push({ name, ...t, duration: duration || 2 });
  }

  function processStatusEffects(char) {
    const msgs = [];
    for (const eff of char.statusEffects) {
      if (eff.hpPerTurn) {
        char.hp = Math.max(0, char.hp + eff.hpPerTurn);
        msgs.push(`${eff.icon} ${char.name} takes ${Math.abs(eff.hpPerTurn)} from **${eff.name}**!`);
      }
      eff.duration--;
    }
    const expired = char.statusEffects.filter((e) => e.duration <= 0);
    for (const e of expired) msgs.push(`${e.icon} **${e.name}** fades.`);
    char.statusEffects = char.statusEffects.filter((e) => e.duration > 0);
    if (char.mana < char.maxMana) char.mana = Math.min(char.maxMana, char.mana + 1);
    return msgs;
  }

  function hasStatus(char, name) { return char.statusEffects.some((s) => s.name === name); }
  function isStunned(char) { return char.statusEffects.some((s) => s.skipTurn); }
  function isDodging(char) { return char.statusEffects.some((s) => s.dodge); }

  function getAtkBonus(char) {
    return char.statusEffects.reduce((sum, e) => sum + (e.atkBonus || 0) + (e.allBonus || 0), 0);
  }
  function getDmgBonus(char) {
    return char.statusEffects.reduce((sum, e) => sum + (e.dmgBonus || 0) + (e.allBonus || 0), 0);
  }
  function getACBonus(char) {
    return char.statusEffects.reduce((sum, e) => sum + (e.acBonus || 0), 0);
  }
  function tickCooldowns(char) {
    for (const s of char.skills) if (s.currentCooldown > 0) s.currentCooldown--;
  }
  function rollDice(notation) {
    const m = notation.match(/(\d+)d(\d+)/);
    if (!m) return 0;
    return Dice.roll(parseInt(m[2]), parseInt(m[1])).total;
  }

  function getSummary(char) {
    const stats = Object.entries(char.stats).map(([k, v]) => `${k}:${v}(${Dice.modStr(v)})`).join(" ");
    const effects = char.statusEffects.map((e) => `${e.icon}${e.name}(${e.duration}t)`).join(" ");
    return `${char.name} — Lv${char.level} ${char.race} ${char.class} | HP:${char.hp}/${char.maxHp} MP:${char.mana}/${char.maxMana} AC:${char.ac}+${getACBonus(char)} | ${stats} | Gold:${char.gold} | Items:[${char.inventory.join(",")}] | Effects:[${effects}] | Skills:[${char.skills.map((s) => s.name + (s.currentCooldown > 0 ? "(cd" + s.currentCooldown + ")" : "")).join(",")}]`;
  }

  return {
    create, addXp, takeDamage, heal, restoreMana, useMana,
    addStatus, processStatusEffects, hasStatus, isStunned, isDodging,
    getAtkBonus, getDmgBonus, getACBonus, tickCooldowns, rollDice,
    getSummary, CLASS_DATA, RACE_DATA,
  };
})();
