/* ═══════════════════════════════════════════════
   combat.js — Visual combat with screen shake,
   hit flash, floating damage numbers
   ═══════════════════════════════════════════════ */

const Combat = (() => {
  let active = false;
  let enemies = [];
  let turnNumber = 0;

  function start(combatData) {
    active = true;
    turnNumber = 0;
    if (combatData.enemies && Array.isArray(combatData.enemies)) {
      enemies = combatData.enemies.map((e) => ({
        name: e.name || "Foe", hp: e.hp || 10, maxHp: e.hp || 10,
        ac: e.ac || 10, atk: e.atk || 3, statusEffects: [],
      }));
    } else {
      enemies = [{
        name: combatData.enemy || "Foe", hp: combatData.enemy_hp || 10,
        maxHp: combatData.enemy_hp || 10, ac: combatData.enemy_ac || 10,
        atk: combatData.enemy_atk || 3, statusEffects: [],
      }];
    }
    document.getElementById("combat-overlay")?.classList.remove("hidden");
    renderEnemyBars();
    return enemies;
  }

  function isActive() { return active; }
  function getEnemies() { return enemies; }
  function getAliveEnemies() { return enemies.filter((e) => e.hp > 0); }

  function renderEnemyBars() {
    const c = document.getElementById("combat-arena");
    if (!c) return;
    c.innerHTML = "";

    for (const e of enemies) {
      const div = document.createElement("div");
      div.className = "arena-enemy" + (e.hp <= 0 ? " dead" : "");
      const pct = Math.max(0, (e.hp / e.maxHp) * 100);
      const hpColor = pct > 50 ? "#5a5" : pct > 25 ? "#c84" : "#c44";
      const sts = (e.statusEffects || []).map((s) => `<span class="arena-status">${s.icon || ""}</span>`).join("");

      div.innerHTML = `
        <div class="arena-enemy-sprite">${getEnemyEmoji(e.name)}</div>
        <div class="arena-enemy-name">${e.name} ${sts}</div>
        <div class="arena-hp-bar"><div class="arena-hp-fill" style="width:${pct}%;background:${hpColor}"></div></div>
        <div class="arena-hp-text">${e.hp}/${e.maxHp}</div>
      `;
      c.appendChild(div);
    }
  }

  function getEnemyEmoji(name) {
    const n = name.toLowerCase();
    if (n.includes("dragon")) return "🐉";
    if (n.includes("goblin")) return "👺";
    if (n.includes("skeleton") || n.includes("undead")) return "💀";
    if (n.includes("wolf")) return "🐺";
    if (n.includes("spider")) return "🕷️";
    if (n.includes("orc")) return "👹";
    if (n.includes("rat")) return "🐀";
    if (n.includes("bandit") || n.includes("thief")) return "🥷";
    if (n.includes("bear")) return "🐻";
    if (n.includes("troll")) return "🧟";
    if (n.includes("demon")) return "👿";
    if (n.includes("ghost") || n.includes("spirit")) return "👻";
    if (n.includes("slime") || n.includes("ooze")) return "🟢";
    if (n.includes("bat")) return "🦇";
    if (n.includes("snake") || n.includes("serpent")) return "🐍";
    return "⚔️";
  }

  /* ─── Visual effects ─── */
  function screenShake(intensity = 5, duration = 300) {
    const el = document.getElementById("game-screen");
    if (!el) return;
    el.classList.add("shake");
    el.style.setProperty("--shake-intensity", intensity + "px");
    setTimeout(() => el.classList.remove("shake"), duration);
  }

  function hitFlash(target = "arena") {
    const el = document.getElementById(target === "player" ? "sidebar" : "combat-arena");
    if (!el) return;
    el.classList.add("hit-flash");
    setTimeout(() => el.classList.remove("hit-flash"), 200);
  }

  function floatingDamage(amount, x, y, type = "damage") {
    const container = document.getElementById("combat-arena") || document.getElementById("game-screen");
    if (!container) return;
    const float = document.createElement("div");
    float.className = "floating-damage " + type;
    float.textContent = type === "heal" ? `+${amount}` : `-${amount}`;
    float.style.left = (x || 50) + "%";
    float.style.top = (y || 30) + "%";
    container.appendChild(float);
    setTimeout(() => float.remove(), 1200);
  }

  async function playerAttack(char, targetIndex = 0) {
    const target = getAliveEnemies()[targetIndex] || getAliveEnemies()[0];
    if (!target) return { narrative: "No enemies remain!", killed: true };
    const statKey = getAttackStat(char.class);
    const mod = Dice.modifier(char.stats[statKey]) + Character.getAtkBonus(char);
    const atkRoll = Dice.rollAndLog(20, 1, "Attack vs " + target.name).rolls[0];
    const total = atkRoll + mod;
    await Dice.showRollOverlay(atkRoll, 20, 900);

    let dmg = 0, narrative = "";
    if (atkRoll === 20) {
      dmg = Math.max(1, Dice.roll(6, 2).total + mod + Character.getDmgBonus(char));
      target.hp = Math.max(0, target.hp - dmg);
      Sound.swordHit(); screenShake(8); hitFlash("arena");
      floatingDamage(dmg, 50, 20, "crit");
      if (typeof Particles !== "undefined") Particles.burst("sparks", 15);
      narrative = `⚔️ **CRITICAL HIT!** Nat 20! (${total} vs AC ${target.ac}) — **${dmg} dmg** to ${target.name}!`;
    } else if (atkRoll === 1) {
      Sound.miss();
      narrative = `😬 **Critical miss!** Nat 1!`;
    } else if (total >= target.ac) {
      dmg = Math.max(1, Dice.roll(6).rolls[0] + mod + Character.getDmgBonus(char));
      target.hp = Math.max(0, target.hp - dmg);
      Sound.swordHit(); screenShake(3); hitFlash("arena");
      floatingDamage(dmg, 50, 20);
      narrative = `⚔️ (🎲${atkRoll}+${mod}=${total} vs AC ${target.ac}) — **Hit! ${dmg} dmg** to ${target.name}.`;
    } else {
      Sound.miss();
      narrative = `🛡️ (🎲${atkRoll}+${mod}=${total} vs AC ${target.ac}) — **Miss!**`;
    }
    if (target.hp <= 0) narrative += `\n💀 **${target.name} slain!**`;
    const allDead = getAliveEnemies().length === 0;
    if (allDead) { narrative += "\n\n🏆 **Victory!**"; end(); }
    renderEnemyBars();
    return { hit: total >= target.ac, roll: atkRoll, damage: dmg, killed: allDead, narrative, enemyName: target.name };
  }

  async function playerSkill(char, skillIndex) {
    const skill = char.skills[skillIndex];
    if (!skill) return { narrative: "Unknown skill!", killed: false };
    if (skill.currentCooldown > 0) return { narrative: `**${skill.name}** on cooldown (${skill.currentCooldown}t)!`, killed: false };
    if (!Character.useMana(char, skill.manaCost)) return { narrative: `Not enough mana for **${skill.name}**! (Need ${skill.manaCost})`, killed: false };
    skill.currentCooldown = skill.cooldown;
    Sound.magic();
    if (typeof Particles !== "undefined") Particles.burst("mystical", 10);
    const target = getAliveEnemies()[0];
    if (!target && !["heal", "buff", "dodge"].includes(skill.type)) return { narrative: "No target!", killed: false };
    const statMod = Dice.modifier(char.stats[skill.stat] || 10);
    let narrative = `✨ **${skill.name}!** `, killed = false;

    switch (skill.type) {
      case "damage": {
        const d = Math.max(1, Character.rollDice(skill.dmgDice) + statMod + Character.getDmgBonus(char));
        target.hp = Math.max(0, target.hp - d);
        screenShake(5); hitFlash("arena"); floatingDamage(d, 50, 20);
        narrative += `**${d} damage** to ${target.name}!`;
        if (target.hp <= 0) narrative += ` 💀 **Slain!**`;
        break;
      }
      case "heal": {
        const a = Math.max(1, Character.rollDice("1d8") + statMod);
        Character.heal(char, a); Sound.heal();
        floatingDamage(a, 50, 50, "heal");
        narrative += `Restores **${a} HP**! (${char.hp}/${char.maxHp})`;
        break;
      }
      case "buff": {
        if (skill.name.includes("Shield") || skill.name.includes("Arcane")) Character.addStatus(char, "Shielded", 3);
        else if (skill.name.includes("Bless")) Character.addStatus(char, "Blessed", 3);
        else if (skill.name.includes("Inspire") || skill.name.includes("Hymn")) Character.addStatus(char, "Inspired", 2);
        else if (skill.name.includes("Mark") || skill.name.includes("Hunter")) Character.addStatus(char, "Marked", 3);
        else Character.addStatus(char, "Blessed", 2);
        narrative += "Buff applied!";
        break;
      }
      case "stun": {
        const d = Character.rollDice(skill.dmgDice);
        if (d > 0) { target.hp = Math.max(0, target.hp - d); narrative += `${d} dmg! `; floatingDamage(d, 50, 20); }
        target.statusEffects.push({ name: "Stunned", duration: 1, skipTurn: true, icon: "💫" });
        narrative += `${target.name} **Stunned**!`;
        screenShake(4);
        break;
      }
      case "poison": {
        const d = Math.max(1, Character.rollDice(skill.dmgDice) + statMod);
        target.hp = Math.max(0, target.hp - d);
        target.statusEffects.push({ name: "Poisoned", duration: 3, hpPerTurn: -2, icon: "🤢" });
        floatingDamage(d, 50, 20);
        narrative += `${d} dmg! ${target.name} **Poisoned**!`;
        break;
      }
      case "slow": {
        const d = Math.max(1, Character.rollDice(skill.dmgDice) + statMod);
        target.hp = Math.max(0, target.hp - d);
        target.statusEffects.push({ name: "Slowed", duration: 2, atkPenalty: -2, icon: "🐌" });
        floatingDamage(d, 50, 20);
        narrative += `${d} dmg! ${target.name} **Slowed**!`;
        break;
      }
      case "dodge": {
        Character.addStatus(char, "Dodging", 1);
        narrative += "Preparing to dodge!";
        break;
      }
      case "debuff": {
        const d = Character.rollDice(skill.dmgDice);
        if (d > 0) { target.hp = Math.max(0, target.hp - d); narrative += `${d} psychic dmg! `; floatingDamage(d, 50, 20); }
        target.statusEffects.push({ name: "Weakened", duration: 3, atkPenalty: -2, icon: "📉" });
        narrative += `${target.name} **Weakened**!`;
        break;
      }
    }

    if (target && target.hp <= 0 && getAliveEnemies().length === 0) {
      narrative += "\n\n🏆 **Victory!**"; end(); killed = true;
    }
    renderEnemyBars();
    return { narrative, killed, enemyName: target?.name };
  }

  async function enemyAttack(char) {
    const narratives = [];
    for (const e of getAliveEnemies()) {
      if (e.statusEffects) {
        for (const eff of e.statusEffects) {
          if (eff.hpPerTurn) {
            e.hp = Math.max(0, e.hp + eff.hpPerTurn);
            narratives.push(`${eff.icon} ${e.name} takes ${Math.abs(eff.hpPerTurn)} from **${eff.name}**!`);
          }
          eff.duration--;
        }
        const stunned = e.statusEffects.some((s) => s.skipTurn && s.duration >= 0);
        e.statusEffects = e.statusEffects.filter((s) => s.duration > 0);
        if (e.hp <= 0) { narratives.push(`💀 ${e.name} falls!`); continue; }
        if (stunned) { narratives.push(`💫 ${e.name} is **Stunned**!`); continue; }
      }
      if (Character.isDodging(char)) { Sound.miss(); narratives.push(`💨 You **dodge** ${e.name}'s attack!`); continue; }

      const penalty = (e.statusEffects || []).reduce((s, x) => s + (x.atkPenalty || 0), 0);
      const atkRoll = Dice.roll(20).rolls[0];
      const total = atkRoll + e.atk + penalty;
      const playerAC = char.ac + Character.getACBonus(char);

      if (atkRoll === 20) {
        const d = Math.max(1, Dice.roll(6, 2).total + e.atk);
        Character.takeDamage(char, d); Sound.hit(); Sound.screenShake();
        screenShake(8, 400); hitFlash("player");
        floatingDamage(d, 50, 60, "crit");
        narratives.push(`🔥 **${e.name} CRITS!** — **${d} dmg!** (HP: ${char.hp}/${char.maxHp})`);
      } else if (total >= playerAC) {
        const d = Math.max(1, Dice.roll(6).rolls[0] + e.atk + penalty);
        Character.takeDamage(char, d); Sound.hit();
        screenShake(4); hitFlash("player");
        floatingDamage(d, 50, 60);
        narratives.push(`🗡️ ${e.name} (${total} vs AC ${playerAC}) — **${d} dmg** (HP: ${char.hp}/${char.maxHp})`);
      } else {
        Sound.miss();
        narratives.push(`🛡️ ${e.name} (${total} vs AC ${playerAC}) — **Miss!**`);
      }
    }
    const allDead = getAliveEnemies().length === 0;
    if (allDead && active) { narratives.push("\n🏆 **Victory!**"); end(); }
    turnNumber++;
    renderEnemyBars();
    return { narrative: narratives.join("\n"), playerDead: char.hp <= 0, allEnemiesDead: allDead };
  }

  function end() {
    active = false; enemies = [];
    document.getElementById("combat-overlay")?.classList.add("hidden");
    const b = document.getElementById("combat-arena"); if (b) b.innerHTML = "";
  }

  function getAttackStat(cc) {
    return { Warrior: "STR", Mage: "INT", Rogue: "DEX", Cleric: "WIS", Ranger: "DEX", Bard: "CHA" }[cc] || "STR";
  }

  function getCombatActions(char) {
    const actions = ["⚔️ Attack"];
    for (const s of char.skills) {
      if (s.currentCooldown === 0 && char.mana >= s.manaCost) actions.push(`✨ ${s.name} [${s.manaCost}MP]`);
    }
    actions.push("🛡️ Defend");
    if (char.inventory.includes("Health Potion")) actions.push("🧪 Health Potion");
    if (char.inventory.includes("Mana Potion")) actions.push("🔮 Mana Potion");
    actions.push("🏃 Flee");
    return actions;
  }

  return {
    start, isActive, getEnemies, getAliveEnemies, renderEnemyBars,
    playerAttack, playerSkill, enemyAttack, end, getCombatActions, getAttackStat,
    screenShake, hitFlash, floatingDamage,
  };
})();
