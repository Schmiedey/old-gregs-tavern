/* ═══════════════════════════════════════════
   character.js — Character model & helpers
   ═══════════════════════════════════════════ */

const Character = (() => {
  const CLASS_DATA = {
    Warrior: { hpBase: 12, hpPerLvl: 7, bonusStat: "STR", skills: ["Power Attack", "Shield Bash", "Intimidate"] },
    Mage:    { hpBase: 8,  hpPerLvl: 4, bonusStat: "INT", skills: ["Fireball", "Arcane Shield", "Detect Magic"] },
    Rogue:   { hpBase: 10, hpPerLvl: 5, bonusStat: "DEX", skills: ["Sneak Attack", "Pick Lock", "Steal"] },
    Cleric:  { hpBase: 10, hpPerLvl: 6, bonusStat: "WIS", skills: ["Heal", "Smite Undead", "Bless"] },
    Ranger:  { hpBase: 10, hpPerLvl: 5, bonusStat: "DEX", skills: ["Track", "Called Shot", "Animal Friend"] },
    Bard:    { hpBase: 9,  hpPerLvl: 5, bonusStat: "CHA", skills: ["Inspire", "Charm", "Lore"] },
  };

  const RACE_DATA = {
    Human:    { bonus: {}, desc: "Versatile and ambitious." },
    Elf:      { bonus: { DEX: 2, INT: 1 }, desc: "Graceful and keen-eyed." },
    Dwarf:    { bonus: { CON: 2, STR: 1 }, desc: "Stout and unyielding." },
    Halfling: { bonus: { DEX: 2, CHA: 1 }, desc: "Lucky and light-footed." },
    Orc:      { bonus: { STR: 2, CON: 1 }, desc: "Fierce and relentless." },
    Tiefling: { bonus: { CHA: 2, INT: 1 }, desc: "Cunning and infernal." },
  };

  function create(name, race, charClass, baseStats) {
    const raceBonuses = RACE_DATA[race]?.bonus || {};
    const stats = { ...baseStats };

    // Apply racial bonuses
    for (const [stat, val] of Object.entries(raceBonuses)) {
      stats[stat] = (stats[stat] || 10) + val;
    }

    const cd = CLASS_DATA[charClass];
    const conMod = Dice.modifier(stats.CON);
    const maxHp = cd.hpBase + Math.max(0, conMod);

    return {
      name,
      race,
      class: charClass,
      level: 1,
      xp: 0,
      xpToLevel: 100,
      stats,
      maxHp,
      hp: maxHp,
      ac: 10 + Dice.modifier(stats.DEX),
      gold: 10,
      inventory: ["Torch", getStartingWeapon(charClass)],
      quests: [],
      skills: cd.skills || [],
      conditions: [],
      turnCount: 0,
    };
  }

  function getStartingWeapon(charClass) {
    const weapons = {
      Warrior: "Iron Longsword",
      Mage: "Gnarled Staff",
      Rogue: "Twin Daggers",
      Cleric: "Holy Mace",
      Ranger: "Longbow",
      Bard: "Lute & Rapier",
    };
    return weapons[charClass] || "Rusty Sword";
  }

  function addXp(char, amount) {
    char.xp += amount;
    let leveled = false;
    while (char.xp >= char.xpToLevel) {
      char.xp -= char.xpToLevel;
      char.level++;
      char.xpToLevel = Math.floor(char.xpToLevel * 1.5);
      const cd = CLASS_DATA[char.class];
      const hpGain = cd.hpPerLvl + Math.max(0, Dice.modifier(char.stats.CON));
      char.maxHp += hpGain;
      char.hp = char.maxHp;
      leveled = true;
    }
    return leveled;
  }

  function takeDamage(char, amount) {
    char.hp = Math.max(0, char.hp - amount);
    return char.hp <= 0;
  }

  function heal(char, amount) {
    char.hp = Math.min(char.maxHp, char.hp + amount);
  }

  function getSummary(char) {
    const stats = Object.entries(char.stats)
      .map(([k, v]) => `${k}:${v}(${Dice.modStr(v)})`)
      .join(" ");
    return `${char.name} — Level ${char.level} ${char.race} ${char.class} | HP:${char.hp}/${char.maxHp} AC:${char.ac} | ${stats} | Gold:${char.gold} | Items: ${char.inventory.join(", ")} | Quests: ${char.quests.length > 0 ? char.quests.join(", ") : "None"} | Skills: ${char.skills.join(", ")}`;
  }

  return { create, addXp, takeDamage, heal, getSummary, CLASS_DATA, RACE_DATA };
})();
