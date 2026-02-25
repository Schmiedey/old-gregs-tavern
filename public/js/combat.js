/* ═══════════════════════════════════════════
   combat.js — Simplified D&D-lite combat
   ═══════════════════════════════════════════ */

const Combat = (() => {
  let active = false;
  let enemy = null;
  let turnNumber = 0;

  function start(enemyData) {
    active = true;
    turnNumber = 0;
    enemy = {
      name: enemyData.enemy || "Unknown Foe",
      hp: enemyData.enemy_hp || 10,
      maxHp: enemyData.enemy_hp || 10,
      ac: enemyData.enemy_ac || 10,
      atk: enemyData.enemy_atk || 3,
      description: enemyData.description || "",
    };
    document.getElementById("combat-overlay").classList.remove("hidden");
    return enemy;
  }

  function isActive() {
    return active;
  }

  function getEnemy() {
    return enemy;
  }

  /**
   * Player attacks enemy
   * Returns { hit, roll, damage, killed, narrative }
   */
  async function playerAttack(char) {
    const statKey = getAttackStat(char.class);
    const mod = Dice.modifier(char.stats[statKey]);
    const atkRoll = Dice.roll(20).rolls[0];
    const totalAtk = atkRoll + mod;

    await Dice.showRollOverlay(atkRoll, 20, 1000);

    const hit = totalAtk >= enemy.ac;
    let damage = 0;
    let narrative = "";

    if (atkRoll === 20) {
      // Critical hit!
      damage = Dice.roll(6).rolls[0] + Dice.roll(6).rolls[0] + mod;
      damage = Math.max(1, damage);
      enemy.hp = Math.max(0, enemy.hp - damage);
      narrative = `⚔️ **CRITICAL HIT!** You rolled a natural 20! (${totalAtk} vs AC ${enemy.ac}) — **${damage} damage** to ${enemy.name}!`;
    } else if (atkRoll === 1) {
      narrative = `😬 **Critical miss!** You rolled a natural 1… Your attack goes wildly off-target!`;
    } else if (hit) {
      damage = Math.max(1, Dice.roll(6).rolls[0] + mod);
      enemy.hp = Math.max(0, enemy.hp - damage);
      narrative = `⚔️ You attack! (🎲 ${atkRoll} + ${mod} = ${totalAtk} vs AC ${enemy.ac}) — **Hit! ${damage} damage** to ${enemy.name}.`;
    } else {
      narrative = `🛡️ You attack! (🎲 ${atkRoll} + ${mod} = ${totalAtk} vs AC ${enemy.ac}) — **Miss!** ${enemy.name} deflects the blow.`;
    }

    const killed = enemy.hp <= 0;
    if (killed) {
      narrative += `\n\n💀 **${enemy.name} has been slain!**`;
      end();
    } else {
      narrative += ` (${enemy.name}: ${enemy.hp}/${enemy.maxHp} HP)`;
    }

    return { hit, roll: atkRoll, damage, killed, narrative };
  }

  /**
   * Enemy attacks player
   */
  async function enemyAttack(char) {
    const atkRoll = Dice.roll(20).rolls[0];
    const totalAtk = atkRoll + enemy.atk;
    const hit = totalAtk >= char.ac;
    let damage = 0;
    let narrative = "";

    if (atkRoll === 20) {
      damage = Dice.roll(6).rolls[0] + Dice.roll(6).rolls[0] + enemy.atk;
      damage = Math.max(1, damage);
      const dead = Character.takeDamage(char, damage);
      narrative = `🔥 **${enemy.name} lands a CRITICAL HIT!** (🎲 nat 20) — **${damage} damage** to you!`;
      if (dead) narrative += `\n\n💀 **You have fallen…**`;
    } else if (hit) {
      damage = Math.max(1, Dice.roll(6).rolls[0] + enemy.atk);
      const dead = Character.takeDamage(char, damage);
      narrative = `🗡️ ${enemy.name} attacks! (🎲 ${totalAtk} vs your AC ${char.ac}) — **Hit! ${damage} damage.**`;
      if (dead) narrative += `\n\n💀 **You have fallen…**`;
    } else {
      narrative = `🛡️ ${enemy.name} attacks! (🎲 ${totalAtk} vs your AC ${char.ac}) — **Miss!** You dodge in time.`;
    }

    narrative += ` (Your HP: ${char.hp}/${char.maxHp})`;
    turnNumber++;

    return { hit, roll: atkRoll, damage, narrative, playerDead: char.hp <= 0 };
  }

  function end() {
    active = false;
    enemy = null;
    document.getElementById("combat-overlay").classList.add("hidden");
  }

  function getAttackStat(charClass) {
    const map = { Warrior: "STR", Mage: "INT", Rogue: "DEX", Cleric: "WIS", Ranger: "DEX", Bard: "CHA" };
    return map[charClass] || "STR";
  }

  function getCombatActions(char) {
    const actions = [
      "⚔️ Attack",
      "🛡️ Defend (gain +2 AC this turn)",
    ];
    // Add class-specific skill
    if (char.skills && char.skills.length > 0) {
      actions.push(`✨ ${char.skills[0]}`);
    }
    if (char.inventory.includes("Health Potion")) {
      actions.push("🧪 Use Health Potion");
    }
    actions.push("🏃 Attempt to Flee");
    return actions;
  }

  return { start, isActive, getEnemy, playerAttack, enemyAttack, end, getCombatActions };
})();
