/* ═══════════════════════════════════════════
   combat2d.js — Real-time 2D combat system
   Player attacks enemies on the map, enemies
   chase and attack back. Uses D&D dice rolls.
   ═══════════════════════════════════════════ */

const Combat2D = (() => {
  let paused = false;
  let combatLog = [];
  const ATTACK_RANGE = Sprites.TILE * 1.3;
  const ENEMY_ATTACK_RANGE = Sprites.TILE * 1.0;
  const ENEMY_ATTACK_CD = 1200; // ms

  function isPaused() { return paused; }
  function setPaused(v) { paused = v; }
  function getLog() { return combatLog; }
  function clearLog() { combatLog = []; }

  function addLog(msg) {
    combatLog.push(msg);
    if (combatLog.length > 8) combatLog.shift();
  }

  /* ─── Player attacks (Space key) ─── */
  function playerAttack(player, charData) {
    if (!Player.attack()) return;

    const box = Player.getAttackBox();
    const enemies = Entities.getEnemiesInBox(box);

    if (enemies.length === 0) {
      // Whiff
      Sound.miss();
      return;
    }

    for (const enemy of enemies) {
      const statKey = getAttackStat(charData.class);
      const mod = Dice.modifier(charData.stats[statKey]) + Character.getAtkBonus(charData);
      const roll = Dice.rollAndLog(20, 1, "Attack vs " + enemy.name);
      const atkRoll = roll.rolls[0];
      const total = atkRoll + mod;

      let dmg = 0;
      if (atkRoll === 20) {
        // Critical hit!
        dmg = Math.max(1, Dice.roll(6, 2).total + mod + Character.getDmgBonus(charData));
        enemy.hp -= dmg;
        Camera.addShake(8);
        Sound.swordHit();
        Entities.spawnParticles(enemy.x + 16, enemy.y + 10, 12, "#ffd700");
        Entities.addFloatingText(enemy.x + 16, enemy.y - 8, `CRIT ${dmg}!`, "#ffd700");
        addLog(`⚔️ CRIT! ${dmg} dmg to ${enemy.name}!`);
      } else if (total >= enemy.ac) {
        dmg = Math.max(1, Dice.roll(6).rolls[0] + mod + Character.getDmgBonus(charData));
        enemy.hp -= dmg;
        Camera.addShake(3);
        Sound.swordHit();
        Entities.spawnParticles(enemy.x + 16, enemy.y + 10, 5, "#fff");
        Entities.addFloatingText(enemy.x + 16, enemy.y - 8, String(dmg), "#ff4444");
        addLog(`⚔️ Hit! ${dmg} dmg to ${enemy.name}`);
      } else {
        Sound.miss();
        Entities.addFloatingText(enemy.x + 16, enemy.y - 8, "MISS", "#aaa");
        addLog(`🛡️ Miss vs ${enemy.name}`);
      }

      enemy.flashTimer = 200;

      if (enemy.hp <= 0) {
        handleEnemyDeath(enemy, charData);
      }
    }
  }

  function handleEnemyDeath(enemy, charData) {
    addLog(`💀 ${enemy.name} defeated!`);
    Sound.gold();
    Entities.spawnParticles(enemy.x + 16, enemy.y + 10, 20, "#ffd700");

    // XP
    const xp = enemy.xp || 10;
    const leveled = Character.addXp(charData, xp);
    charData.gold += (enemy.gold || 5);
    Entities.addFloatingText(enemy.x + 16, enemy.y - 20, `+${xp} XP`, "#44ff44");
    HUD.toast(`💀 ${enemy.name} defeated! +${xp} XP, +${enemy.gold || 5}g`);

    if (leveled) {
      Sound.levelUp();
      HUD.toast(`🎉 Level Up! You are now level ${charData.level}!`, "#ffd700");
    }

    // Remove dead enemy after a delay
    const id = enemy.id;
    setTimeout(() => Entities.remove(id), 500);

    // Check achievements
    if (typeof Achievements !== "undefined") {
      Achievements.increment("combats_won");
      Achievements.checkAll(charData, {
        combatWon: true,
        enemyName: enemy.name,
      });
    }
  }

  /* ─── Enemy attacks (automatic in update) ─── */
  function updateEnemyAttacks(dt, charData) {
    if (paused) return;

    const pPos = Player.getCenter();
    const enemies = Entities.getEnemies();

    for (const e of enemies) {
      if (e.attackCooldown > 0) continue;

      const ex = e.x + Sprites.TILE / 2;
      const ey = e.y + Sprites.TILE / 2;
      const dist = Math.sqrt((ex - pPos.x) ** 2 + (ey - pPos.y) ** 2);

      if (dist < ENEMY_ATTACK_RANGE) {
        e.attackCooldown = ENEMY_ATTACK_CD;

        const atkRoll = Dice.roll(20).rolls[0];
        const total = atkRoll + (e.atk || 2);
        const playerAC = charData.ac + Character.getACBonus(charData);

        if (Character.isDodging(charData)) {
          Sound.miss();
          Entities.addFloatingText(pPos.x, pPos.y - 20, "DODGE!", "#88f");
          addLog(`💨 Dodged ${e.name}'s attack!`);
        } else if (atkRoll === 20) {
          const dmg = Math.max(1, Dice.roll(6, 2).total + (e.atk || 2));
          const dead = Character.takeDamage(charData, dmg);
          Player.takeDamage(dmg);
          Camera.addShake(10);
          Sound.hit();
          Entities.addFloatingText(pPos.x, pPos.y - 20, `CRIT ${dmg}!`, "#ff0000");
          addLog(`🔥 ${e.name} CRITS! ${dmg} dmg!`);
          if (dead) handlePlayerDeath(charData);
        } else if (total >= playerAC) {
          const dmg = Math.max(1, Dice.roll(6).rolls[0] + (e.atk || 2));
          const dead = Character.takeDamage(charData, dmg);
          Player.takeDamage(dmg);
          Camera.addShake(4);
          Sound.hit();
          Entities.addFloatingText(pPos.x, pPos.y - 20, String(dmg), "#ff6644");
          addLog(`🗡️ ${e.name} hits for ${dmg}`);
          if (dead) handlePlayerDeath(charData);
        } else {
          Sound.miss();
          Entities.addFloatingText(pPos.x, pPos.y - 20, "MISS", "#666");
          addLog(`🛡️ ${e.name} misses`);
        }
      }
    }
  }

  function handlePlayerDeath(charData) {
    Sound.death();
    addLog("💀 You have fallen...");
    HUD.toast("💀 You have fallen... Returning to tavern.", "#ff4444");

    if (charData.permadeath) {
      HUD.toast("☠️ PERMADEATH — Your adventure ends here.", "#ff0000");
      Save.remove(0);
      setTimeout(() => Game.switchScreen("title"), 3000);
    } else {
      charData.hp = Math.floor(charData.maxHp / 2);
      charData.mana = Math.floor(charData.maxMana / 2);
      charData.gold = Math.max(0, charData.gold - 10);
      setTimeout(() => Game.transitionTo("tavern", "default"), 1500);
    }
  }

  /* ─── Use skill in real-time ─── */
  function useSkill(charData, skillIndex) {
    const skill = charData.skills[skillIndex];
    if (!skill) return;
    if (skill.currentCooldown > 0) {
      HUD.toast(`${skill.name} on cooldown!`, "#c44");
      return;
    }
    if (!Character.useMana(charData, skill.manaCost)) {
      HUD.toast(`Not enough mana for ${skill.name}!`, "#44c");
      return;
    }
    skill.currentCooldown = skill.cooldown;
    Sound.magic();

    const pPos = Player.getCenter();
    Entities.spawnParticles(pPos.x, pPos.y, 10, "#aa66ff");

    if (skill.type === "heal") {
      const amt = Math.max(1, Character.rollDice("1d8") + Dice.modifier(charData.stats[skill.stat] || 10));
      Character.heal(charData, amt);
      Entities.addFloatingText(pPos.x, pPos.y - 20, `+${amt} HP`, "#44ff44");
      addLog(`✨ ${skill.name}: +${amt} HP`);
      Sound.heal();
    } else if (skill.type === "buff" || skill.type === "dodge") {
      Character.addStatus(charData, "Blessed", 3);
      addLog(`✨ ${skill.name} activated!`);
    } else {
      // Damage skills — hit nearest enemy
      const enemies = Entities.getEnemies();
      if (enemies.length === 0) { addLog("No enemies nearby!"); return; }

      let closest = null, closestDist = Infinity;
      for (const e of enemies) {
        const d = Math.sqrt((e.x - pPos.x) ** 2 + (e.y - pPos.y) ** 2);
        if (d < closestDist && d < Sprites.TILE * 5) { closest = e; closestDist = d; }
      }

      if (closest) {
        const statMod = Dice.modifier(charData.stats[skill.stat] || 10);
        const dmg = Math.max(1, Character.rollDice(skill.dmgDice) + statMod + Character.getDmgBonus(charData));
        closest.hp -= dmg;
        closest.flashTimer = 300;
        Camera.addShake(5);
        Entities.spawnParticles(closest.x + 16, closest.y + 10, 15, "#aa66ff");
        Entities.addFloatingText(closest.x + 16, closest.y - 8, String(dmg), "#cc66ff");
        addLog(`✨ ${skill.name}: ${dmg} dmg to ${closest.name}!`);

        if (skill.type === "stun") {
          closest.attackCooldown = 3000;
          addLog(`💫 ${closest.name} stunned!`);
        }
        if (skill.type === "poison") {
          // Simulate poison as slower attack speed
          closest.speed = (closest.speed || 1) * 0.5;
          addLog(`🤢 ${closest.name} poisoned!`);
        }

        if (closest.hp <= 0) handleEnemyDeath(closest, charData);
      }
    }
  }

  function getAttackStat(cc) {
    return { Warrior: "STR", Mage: "INT", Rogue: "DEX", Cleric: "WIS", Ranger: "DEX", Bard: "CHA" }[cc] || "STR";
  }

  // Tick cooldowns every second
  function tickCooldowns(charData) {
    for (const s of charData.skills) {
      if (s.currentCooldown > 0) s.currentCooldown--;
    }
    Character.processStatusEffects(charData);
    // Mana regen
    if (charData.mana < charData.maxMana) {
      charData.mana = Math.min(charData.maxMana, charData.mana + 1);
    }
  }

  return {
    isPaused, setPaused, playerAttack, updateEnemyAttacks,
    useSkill, tickCooldowns, getLog, clearLog, addLog,
  };
})();
