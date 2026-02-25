/* ═══════════════════════════════════════════════
   game.js — Main game controller & UI wiring
   ═══════════════════════════════════════════════ */

(() => {
  "use strict";

  /* ─── State ─── */
  let player = null;
  let selectedRace = null;
  let selectedClass = null;
  let currentStats = null;
  let isProcessing = false;

  /* ─── DOM refs ─── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    title: $("#title-screen"),
    char:  $("#char-screen"),
    game:  $("#game-screen"),
  };

  const ui = {
    charName:      $("#char-name"),
    raceGrid:      $("#race-grid"),
    classGrid:     $("#class-grid"),
    statBlock:     $("#stat-block"),
    btnReroll:     $("#btn-reroll"),
    btnStart:      $("#btn-start-adventure"),
    messages:      $("#messages"),
    narrativeLog:  $("#narrative-log"),
    quickActions:  $("#quick-actions"),
    playerInput:   $("#player-input"),
    btnSend:       $("#btn-send"),
    sidebar:       $("#sidebar"),
    btnToggle:     $("#btn-toggle-sidebar"),
  };

  /* ═══════ SCREEN MANAGEMENT ═══════ */
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  /* ═══════ TITLE SCREEN ═══════ */
  $("#btn-new-game").addEventListener("click", () => showScreen("char"));

  /* ═══════ CHARACTER CREATION ═══════ */
  function setupOptionGrid(grid, callback) {
    grid.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        grid.querySelectorAll(".opt-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        callback(btn.dataset.value);
      });
    });
  }

  setupOptionGrid(ui.raceGrid, (val) => {
    selectedRace = val;
    checkCharReady();
  });

  setupOptionGrid(ui.classGrid, (val) => {
    selectedClass = val;
    rollAndShowStats();
    checkCharReady();
  });

  function rollAndShowStats() {
    currentStats = Dice.rollStats();
    // Apply class-themed bump
    for (const [key, val] of Object.entries(currentStats)) {
      $(`#stat-${key.toLowerCase()}`).textContent = val;
    }
    ui.statBlock.classList.remove("hidden");
  }

  ui.btnReroll.addEventListener("click", () => {
    rollAndShowStats();
  });

  function checkCharReady() {
    const nameOk = ui.charName.value.trim().length > 0;
    ui.btnStart.disabled = !(nameOk && selectedRace && selectedClass && currentStats);
  }

  ui.charName.addEventListener("input", checkCharReady);

  /* ─── Start Adventure ─── */
  ui.btnStart.addEventListener("click", async () => {
    const name = ui.charName.value.trim() || "Adventurer";
    player = Character.create(name, selectedRace, selectedClass, currentStats);
    updateSidebar();

    showScreen("game");
    AI.init(Character.getSummary(player));

    // Get opening narrative from AI
    const reply = await AI.send("I walk into the tavern.", Character.getSummary(player));
    handleGMResponse(reply);
  });

  /* ═══════ SIDEBAR ═══════ */
  function updateSidebar() {
    if (!player) return;

    $("#sb-name").textContent = player.name;
    $("#sb-race-class").textContent = `${player.race} ${player.class}`;
    $("#sb-level").textContent = `Lvl ${player.level}`;

    // HP bar
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    $("#hp-bar").style.width = hpPct + "%";
    $("#hp-text").textContent = `${player.hp} / ${player.maxHp}`;

    // XP bar
    const xpPct = Math.max(0, (player.xp / player.xpToLevel) * 100);
    $("#xp-bar").style.width = xpPct + "%";
    $("#xp-text").textContent = `XP ${player.xp} / ${player.xpToLevel}`;

    // Stats
    const statsEl = $("#sb-stats");
    statsEl.innerHTML = Object.entries(player.stats)
      .map(([k, v]) => `<div class="sb-stat-item"><span class="label">${k}</span><span class="value">${v} (${Dice.modStr(v)})</span></div>`)
      .join("");

    // Inventory
    const invEl = $("#sb-inventory");
    if (player.inventory.length === 0) {
      invEl.innerHTML = '<li class="empty">Empty</li>';
    } else {
      invEl.innerHTML = player.inventory.map((i) => `<li>• ${i}</li>`).join("");
    }

    // Quests
    const questEl = $("#sb-quests");
    if (player.quests.length === 0) {
      questEl.innerHTML = '<li class="empty">None yet</li>';
    } else {
      questEl.innerHTML = player.quests.map((q) => `<li>📜 ${q}</li>`).join("");
    }

    // Gold
    $("#sb-gold").textContent = player.gold;
  }

  ui.btnToggle.addEventListener("click", () => {
    ui.sidebar.classList.toggle("collapsed");
    ui.btnToggle.textContent = ui.sidebar.classList.contains("collapsed") ? "▶" : "◀";
  });

  /* ═══════ MESSAGE LOG ═══════ */
  function addMessage(type, author, content) {
    const div = document.createElement("div");
    div.className = `msg msg-${type}`;

    if (author) {
      const authorEl = document.createElement("div");
      authorEl.className = "msg-author";
      authorEl.textContent = author;
      div.appendChild(authorEl);
    }

    const bodyEl = document.createElement("div");
    bodyEl.className = "msg-body";
    bodyEl.innerHTML = markdownLite(content);
    div.appendChild(bodyEl);

    ui.messages.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      ui.narrativeLog.scrollTop = ui.narrativeLog.scrollHeight;
    });
  }

  /**
   * Minimal markdown → HTML
   */
  function markdownLite(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  /* ═══════ QUICK ACTIONS ═══════ */
  function setQuickActions(options) {
    ui.quickActions.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        if (!isProcessing) sendPlayerAction(opt);
      });
      ui.quickActions.appendChild(btn);
    });
  }

  /* ═══════ HANDLE GM RESPONSE ═══════ */
  function handleGMResponse(rawText) {
    const parsed = AI.parseBlocks(rawText);

    // Process quest updates
    for (const q of parsed.quests) {
      if (q.action === "add" && q.quest && !player.quests.includes(q.quest)) {
        player.quests.push(q.quest);
        addMessage("system", null, `📜 New Quest: **${q.quest}**`);
      } else if (q.action === "complete" && q.quest) {
        player.quests = player.quests.filter((x) => x !== q.quest);
        addMessage("system", null, `✅ Quest Complete: **${q.quest}**`);
      }
    }

    // Process loot
    for (const l of parsed.loot) {
      if (l.gold) player.gold += l.gold;
      if (l.items) player.inventory.push(...l.items);
      if (l.xp) {
        const leveled = Character.addXp(player, l.xp);
        if (leveled) {
          addMessage("system", null, `🎉 **LEVEL UP!** You are now level ${player.level}! HP restored to ${player.maxHp}.`);
        }
      }
      const parts = [];
      if (l.gold) parts.push(`💰 ${l.gold} gold`);
      if (l.items?.length) parts.push(`🎒 ${l.items.join(", ")}`);
      if (l.xp) parts.push(`✨ ${l.xp} XP`);
      if (parts.length) addMessage("system", null, `Loot received: ${parts.join(" | ")}`);
    }

    // Process skill checks
    for (const c of parsed.checks) {
      handleSkillCheck(c);
    }

    // Display narrative
    if (parsed.narrative) {
      addMessage("gm", "🍺 Old Greg", parsed.narrative);
    }

    // Start combat if triggered
    if (parsed.combat) {
      Combat.start(parsed.combat);
      addMessage("combat", "⚔️ Combat", `**${parsed.combat.enemy}** appears! HP: ${parsed.combat.enemy_hp} | AC: ${parsed.combat.enemy_ac}`);
      setQuickActions(Combat.getCombatActions(player));
    } else {
      // Parse options from narrative
      const options = AI.parseOptions(parsed.narrative);
      if (options.length > 0) {
        setQuickActions(options);
      } else {
        setQuickActions(["🔍 Look around", "🗣️ Talk to someone", "⚔️ Look for trouble"]);
      }
    }

    updateSidebar();
  }

  /* ═══════ SKILL CHECKS ═══════ */
  async function handleSkillCheck(check) {
    const stat = check.stat || "DEX";
    const dc = check.dc || 12;
    const roll = Dice.roll(20).rolls[0];
    const mod = Dice.modifier(player.stats[stat] || 10);
    const total = roll + mod;
    const success = total >= dc;

    await Dice.showRollOverlay(roll, 20, 1000);

    const result = success
      ? `✅ **${check.description || "Check"}** — 🎲 ${roll} + ${mod} (${stat}) = ${total} vs DC ${dc} — **Success!**`
      : `❌ **${check.description || "Check"}** — 🎲 ${roll} + ${mod} (${stat}) = ${total} vs DC ${dc} — **Failure!**`;

    addMessage("system", null, result);

    // Feed result back to AI
    AI.addMessage("system", `Skill check result: ${stat} check DC ${dc}. Rolled ${roll} + ${mod} = ${total}. ${success ? "SUCCESS" : "FAILURE"}. Continue the narrative accordingly.`);
  }

  /* ═══════ COMBAT ACTIONS ═══════ */
  async function handleCombatAction(action) {
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes("attack")) {
      const result = await Combat.playerAttack(player);
      addMessage("combat", "⚔️ Combat", result.narrative);

      if (result.killed) {
        // Victory — ask AI to narrate aftermath
        const reply = await AI.send(
          `I defeated ${Combat.getEnemy()?.name || "the enemy"} in combat. Narrate the victory and what happens next. Give loot.`,
          Character.getSummary(player)
        );
        handleGMResponse(reply);
        return;
      }

      // Enemy turn
      const enemyResult = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️ Combat", enemyResult.narrative);
      updateSidebar();

      if (enemyResult.playerDead) {
        handlePlayerDeath();
        return;
      }

      setQuickActions(Combat.getCombatActions(player));
    } else if (lowerAction.includes("defend")) {
      player.ac += 2;
      addMessage("combat", "⚔️ Combat", `🛡️ You raise your guard! (+2 AC this turn, AC is now ${player.ac})`);

      const enemyResult = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️ Combat", enemyResult.narrative);
      player.ac -= 2;
      updateSidebar();

      if (enemyResult.playerDead) {
        handlePlayerDeath();
        return;
      }
      setQuickActions(Combat.getCombatActions(player));
    } else if (lowerAction.includes("flee") || lowerAction.includes("run")) {
      const roll = Dice.roll(20).rolls[0];
      const dexMod = Dice.modifier(player.stats.DEX);
      await Dice.showRollOverlay(roll, 20, 1000);

      if (roll + dexMod >= 12) {
        Combat.end();
        addMessage("combat", "⚔️ Combat", `🏃 You flee successfully! (🎲 ${roll} + ${dexMod} = ${roll + dexMod} vs DC 12)`);
        const reply = await AI.send("I fled from combat successfully. What happens next?", Character.getSummary(player));
        handleGMResponse(reply);
      } else {
        addMessage("combat", "⚔️ Combat", `🏃 Failed to flee! (🎲 ${roll} + ${dexMod} = ${roll + dexMod} vs DC 12)`);
        const enemyResult = await Combat.enemyAttack(player);
        addMessage("combat", "⚔️ Combat", enemyResult.narrative);
        updateSidebar();
        if (enemyResult.playerDead) { handlePlayerDeath(); return; }
        setQuickActions(Combat.getCombatActions(player));
      }
    } else if (lowerAction.includes("potion") || lowerAction.includes("heal")) {
      const idx = player.inventory.indexOf("Health Potion");
      if (idx !== -1) {
        player.inventory.splice(idx, 1);
        const healed = Dice.roll(8).rolls[0] + 2;
        Character.heal(player, healed);
        addMessage("combat", "⚔️ Combat", `🧪 You drink a Health Potion and recover **${healed} HP**! (HP: ${player.hp}/${player.maxHp})`);
      } else {
        addMessage("system", null, "You don't have any Health Potions!");
      }

      const enemyResult = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️ Combat", enemyResult.narrative);
      updateSidebar();
      if (enemyResult.playerDead) { handlePlayerDeath(); return; }
      setQuickActions(Combat.getCombatActions(player));
    } else {
      // Special skill or other — send to AI for flavor, then resolve as attack
      const result = await Combat.playerAttack(player);
      addMessage("combat", "⚔️ Combat", `✨ ${action}!\n${result.narrative}`);

      if (result.killed) {
        const reply = await AI.send(`I used ${action} to defeat ${Combat.getEnemy()?.name || "the enemy"}. Narrate the epic victory. Give loot.`, Character.getSummary(player));
        handleGMResponse(reply);
        return;
      }

      const enemyResult = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️ Combat", enemyResult.narrative);
      updateSidebar();
      if (enemyResult.playerDead) { handlePlayerDeath(); return; }
      setQuickActions(Combat.getCombatActions(player));
    }
  }

  /* ═══════ PLAYER DEATH ═══════ */
  function handlePlayerDeath() {
    Combat.end();
    addMessage("system", null, "💀 **You have fallen in battle…**\n\n*But Old Greg fishes your unconscious body from the floor and drags you back to the tavern. You awaken by the fire, alive but weakened.*");
    player.hp = Math.floor(player.maxHp / 2);
    player.gold = Math.max(0, player.gold - 5);
    updateSidebar();
    setQuickActions(["🍺 Thank Old Greg", "💪 I need to get stronger", "🗺️ What adventure awaits?"]);
  }

  /* ═══════ PLAYER INPUT ═══════ */
  async function sendPlayerAction(text) {
    if (!text.trim() || isProcessing) return;
    isProcessing = true;

    addMessage("player", `🗡️ ${player.name}`, text);

    // If in combat, handle combat action
    if (Combat.isActive()) {
      await handleCombatAction(text);
      isProcessing = false;
      return;
    }

    // Otherwise, send to AI
    const reply = await AI.send(text, Character.getSummary(player));
    handleGMResponse(reply);
    isProcessing = false;
  }

  // Send button
  ui.btnSend.addEventListener("click", () => {
    const text = ui.playerInput.value.trim();
    ui.playerInput.value = "";
    sendPlayerAction(text);
  });

  // Enter key
  ui.playerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ui.btnSend.click();
    }
  });

  // Dice buttons
  $$(".btn-dice").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sides = parseInt(btn.dataset.sides, 10);
      const result = Dice.roll(sides);
      await Dice.showRollOverlay(result.rolls[0], sides, 1200);
      addMessage("system", null, `🎲 Rolled a d${sides}: **${result.rolls[0]}**`);
    });
  });

  /* ═══════ INIT ═══════ */
  showScreen("title");
})();
