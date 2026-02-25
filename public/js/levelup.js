/* ═══════════════════════════════════════════════
   levelup.js — Level-up skill picker system
   On level up, player chooses from 2-3 abilities
   ═══════════════════════════════════════════════ */

const LevelUp = (() => {
  const SKILL_POOL = {
    Warrior: [
      { name: "Cleave",        manaCost: 4, cooldown: 2, dmgDice: "1d12", stat: "STR", type: "damage", desc: "Sweeping strike hits hard" },
      { name: "Battle Cry",    manaCost: 3, cooldown: 3, dmgDice: "0",    stat: "CHA", type: "buff",   desc: "Inspire yourself, +2 ATK 3t" },
      { name: "Whirlwind",     manaCost: 6, cooldown: 3, dmgDice: "2d8",  stat: "STR", type: "damage", desc: "Devastating spin attack" },
      { name: "Iron Will",     manaCost: 3, cooldown: 4, dmgDice: "0",    stat: "CON", type: "buff",   desc: "+4 AC for 2 turns" },
      { name: "Execute",       manaCost: 5, cooldown: 3, dmgDice: "3d6",  stat: "STR", type: "damage", desc: "Massive dmg to wounded foes" },
    ],
    Mage: [
      { name: "Lightning Bolt",manaCost: 7, cooldown: 2, dmgDice: "3d6",  stat: "INT", type: "damage", desc: "Chain lightning" },
      { name: "Teleport",      manaCost: 5, cooldown: 4, dmgDice: "0",    stat: "INT", type: "dodge",  desc: "Blink away from danger" },
      { name: "Meteor",        manaCost: 10,cooldown: 4, dmgDice: "4d6",  stat: "INT", type: "damage", desc: "Rain fire from above" },
      { name: "Mana Surge",    manaCost: 0, cooldown: 5, dmgDice: "0",    stat: "INT", type: "heal",   desc: "Restore 15 mana" },
      { name: "Time Stop",     manaCost: 8, cooldown: 5, dmgDice: "0",    stat: "INT", type: "stun",   desc: "Freeze all enemies 2t" },
    ],
    Rogue: [
      { name: "Shadow Step",   manaCost: 4, cooldown: 2, dmgDice: "2d8",  stat: "DEX", type: "damage", desc: "Teleport behind & strike" },
      { name: "Smoke Bomb",    manaCost: 3, cooldown: 3, dmgDice: "0",    stat: "DEX", type: "dodge",  desc: "Dodge + blind enemies" },
      { name: "Assassinate",   manaCost: 8, cooldown: 4, dmgDice: "4d6",  stat: "DEX", type: "damage", desc: "Lethal precision strike" },
      { name: "Pickpocket",    manaCost: 2, cooldown: 2, dmgDice: "0",    stat: "DEX", type: "debuff", desc: "Steal gold mid-combat" },
      { name: "Fan of Knives", manaCost: 5, cooldown: 3, dmgDice: "2d6",  stat: "DEX", type: "damage", desc: "Hit all enemies" },
    ],
    Cleric: [
      { name: "Holy Nova",     manaCost: 6, cooldown: 3, dmgDice: "2d8",  stat: "WIS", type: "damage", desc: "Radiant burst" },
      { name: "Resurrect",     manaCost: 8, cooldown: 5, dmgDice: "0",    stat: "WIS", type: "heal",   desc: "Full HP restore" },
      { name: "Divine Shield", manaCost: 5, cooldown: 4, dmgDice: "0",    stat: "WIS", type: "buff",   desc: "Invincible 1 turn" },
      { name: "Purify",        manaCost: 3, cooldown: 2, dmgDice: "0",    stat: "WIS", type: "heal",   desc: "Remove all debuffs + heal" },
      { name: "Judgment",      manaCost: 7, cooldown: 3, dmgDice: "3d6",  stat: "WIS", type: "damage", desc: "Holy fire from above" },
    ],
    Ranger: [
      { name: "Rain of Arrows",manaCost: 6, cooldown: 3, dmgDice: "2d8",  stat: "DEX", type: "damage", desc: "Arrow barrage" },
      { name: "Beast Companion",manaCost: 4,cooldown: 4, dmgDice: "1d8",  stat: "WIS", type: "damage", desc: "Call a wolf ally" },
      { name: "Camouflage",    manaCost: 3, cooldown: 3, dmgDice: "0",    stat: "DEX", type: "dodge",  desc: "Blend with surroundings" },
      { name: "Poison Arrow",  manaCost: 4, cooldown: 2, dmgDice: "1d6",  stat: "DEX", type: "poison", desc: "Poisoned arrow 3t" },
      { name: "Headshot",      manaCost: 7, cooldown: 3, dmgDice: "3d8",  stat: "DEX", type: "damage", desc: "Perfect aimed shot" },
    ],
    Bard: [
      { name: "Song of Rest",  manaCost: 4, cooldown: 3, dmgDice: "0",    stat: "CHA", type: "heal",   desc: "Heal + regen 3t" },
      { name: "Dissonant Chord",manaCost: 5,cooldown: 2, dmgDice: "2d6",  stat: "CHA", type: "damage", desc: "Psychic shockwave" },
      { name: "Hymn of Valor",  manaCost: 4,cooldown: 3, dmgDice: "0",    stat: "CHA", type: "buff",   desc: "+3 ATK +2 AC 2t" },
      { name: "Confuse",       manaCost: 4, cooldown: 3, dmgDice: "0",    stat: "CHA", type: "stun",   desc: "Confuse enemy 2t" },
      { name: "Ballad of Doom",manaCost: 7, cooldown: 4, dmgDice: "3d6",  stat: "CHA", type: "debuff", desc: "Psychic dmg + terrify" },
    ],
  };

  const STAT_UPGRADES = [
    { name: "+2 STR", stat: "STR", value: 2, icon: "💪", desc: "Increase Strength by 2" },
    { name: "+2 DEX", stat: "DEX", value: 2, icon: "🏃", desc: "Increase Dexterity by 2" },
    { name: "+2 CON", stat: "CON", value: 2, icon: "❤️", desc: "Increase Constitution by 2" },
    { name: "+2 INT", stat: "INT", value: 2, icon: "🧠", desc: "Increase Intelligence by 2" },
    { name: "+2 WIS", stat: "WIS", value: 2, icon: "👁️", desc: "Increase Wisdom by 2" },
    { name: "+2 CHA", stat: "CHA", value: 2, icon: "✨", desc: "Increase Charisma by 2" },
    { name: "+5 Max HP",  type: "hp",   value: 5, icon: "❤️‍🔥", desc: "Increase max HP by 5" },
    { name: "+5 Max Mana", type: "mana", value: 5, icon: "🔵", desc: "Increase max mana by 5" },
  ];

  function getChoices(charClass, currentSkills) {
    const choices = [];
    const currentNames = currentSkills.map((s) => s.name);

    // 1-2 new skills
    const pool = (SKILL_POOL[charClass] || []).filter((s) => !currentNames.includes(s.name));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const skillCount = Math.min(2, shuffled.length);
    for (let i = 0; i < skillCount; i++) {
      choices.push({ type: "skill", data: { ...shuffled[i], currentCooldown: 0 } });
    }

    // 1 stat upgrade
    const statUpgrade = STAT_UPGRADES[Math.floor(Math.random() * STAT_UPGRADES.length)];
    choices.push({ type: "stat", data: statUpgrade });

    return choices;
  }

  function applyChoice(player, choice) {
    if (choice.type === "skill") {
      player.skills.push({ ...choice.data, currentCooldown: 0 });
      return `Learned **${choice.data.name}**! ${choice.data.desc}`;
    } else if (choice.type === "stat") {
      const d = choice.data;
      if (d.stat) {
        player.stats[d.stat] += d.value;
        return `${d.icon} ${d.name}! ${d.stat} is now ${player.stats[d.stat]}`;
      } else if (d.type === "hp") {
        player.maxHp += d.value;
        player.hp += d.value;
        return `${d.icon} ${d.name}! Max HP is now ${player.maxHp}`;
      } else if (d.type === "mana") {
        player.maxMana += d.value;
        player.mana += d.value;
        return `${d.icon} ${d.name}! Max Mana is now ${player.maxMana}`;
      }
    }
    return "";
  }

  function showPicker(choices, onPick) {
    const modal = document.getElementById("levelup-modal");
    if (!modal) return;
    const body = modal.querySelector(".modal-body") || modal.querySelector("#levelup-choices");
    if (!body) return;

    body.innerHTML = "";

    for (const choice of choices) {
      const card = document.createElement("div");
      card.className = "levelup-choice";

      if (choice.type === "skill") {
        const s = choice.data;
        card.innerHTML = `
          <div class="levelup-choice-icon">✨</div>
          <div class="levelup-choice-name">${s.name}</div>
          <div class="levelup-choice-desc">${s.desc}</div>
          <div class="levelup-choice-stats">Cost: ${s.manaCost} MP · CD: ${s.cooldown}t · ${s.dmgDice !== "0" ? s.dmgDice + " dmg" : s.type}</div>
        `;
      } else {
        const d = choice.data;
        card.innerHTML = `
          <div class="levelup-choice-icon">${d.icon}</div>
          <div class="levelup-choice-name">${d.name}</div>
          <div class="levelup-choice-desc">${d.desc}</div>
        `;
      }

      card.addEventListener("click", () => {
        modal.classList.add("hidden");
        onPick(choice);
      });
      body.appendChild(card);
    }

    modal.classList.remove("hidden");
  }

  return { getChoices, applyChoice, showPicker, SKILL_POOL };
})();
