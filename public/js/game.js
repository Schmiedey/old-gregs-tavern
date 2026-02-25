/* ═══════════════════════════════════════════════════════
   game.js — Main controller — wires all systems
   ═══════════════════════════════════════════════════════ */

const Game = (() => {
  let player = null;
  let state = "title"; // title | create | play | combat
  let processing = false;
  let turnCount = 0;

  /* ─── Boot ─── */
  function init() {
    // Configure AI
    AI.configure(null, null, false);

    // Event listeners
    document.getElementById("btn-new-game")?.addEventListener("click", () => switchScreen("create"));
    document.getElementById("btn-load-game")?.addEventListener("click", showLoadModal);
    document.getElementById("btn-settings")?.addEventListener("click", showSettingsModal);
    document.getElementById("btn-start-adventure")?.addEventListener("click", startNewGame);
    document.getElementById("btn-back-title")?.addEventListener("click", () => switchScreen("title"));
    document.getElementById("player-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } });
    document.getElementById("btn-send")?.addEventListener("click", onSend);
    document.getElementById("btn-roll-dice")?.addEventListener("click", quickRoll);

    // Sidebar buttons
    document.getElementById("btn-inventory")?.addEventListener("click", toggleInventory);
    document.getElementById("btn-equipment")?.addEventListener("click", showEquipmentModal);
    document.getElementById("btn-map")?.addEventListener("click", showMapModal);
    document.getElementById("btn-journal")?.addEventListener("click", showJournalModal);
    document.getElementById("btn-achievements")?.addEventListener("click", showAchievementsModal);
    document.getElementById("btn-codex")?.addEventListener("click", showCodexModal);
    document.getElementById("btn-save")?.addEventListener("click", showSaveModal);
    document.getElementById("btn-quests")?.addEventListener("click", toggleQuests);
    document.getElementById("btn-export")?.addEventListener("click", () => Export.exportAdventure(AI.getConversationHistory(), player));
    document.getElementById("btn-share")?.addEventListener("click", () => { const url = Export.shareCharacter(player); navigator.clipboard?.writeText(url); appendSystemMsg("📋 Character link copied to clipboard!"); });
    document.getElementById("btn-sound-toggle")?.addEventListener("click", () => {
      const on = Sound.toggle();
      document.getElementById("btn-sound-toggle").textContent = on ? "🔊" : "🔇";
    });
    document.getElementById("btn-dice-history")?.addEventListener("click", showDiceHistoryModal);

    // Character creation
    setupCharacterCreation();

    // Check for shared character in URL
    const shared = Export.loadSharedCharacter();
    if (shared) {
      appendSystemMsg("📥 Loaded shared character: " + shared.name);
    }

    // Title particles
    Particles.init(document.getElementById("title-particles"));
    Particles.continuous("embers", 200);

    // Load settings
    const settings = Save.getSettings();
    if (settings.soundOff) Sound.toggle();

    switchScreen("title");
  }

  /* ─── Screen management ─── */
  function switchScreen(screen) {
    state = screen;
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    document.getElementById(screen + "-screen")?.classList.remove("hidden");
    if (screen === "title") Particles.continuous("embers", 200);
    else Particles.stop();
  }

  /* ─── Character Creation ─── */
  function setupCharacterCreation() {
    const raceSelect = document.getElementById("char-race");
    const classSelect = document.getElementById("char-class");
    if (!raceSelect || !classSelect) return;

    for (const [r, data] of Object.entries(Character.RACE_DATA)) {
      const opt = document.createElement("option"); opt.value = r; opt.textContent = `${r} — ${data.desc}`;
      raceSelect.appendChild(opt);
    }
    for (const c of Object.keys(Character.CLASS_DATA)) {
      const opt = document.createElement("option"); opt.value = c; opt.textContent = c;
      classSelect.appendChild(opt);
    }

    const updatePreview = () => {
      const race = raceSelect.value;
      const cc = classSelect.value;
      if (!race || !cc) return;
      document.getElementById("char-preview-portrait").innerHTML = Portraits.generate(race, cc);
      const cd = Character.CLASS_DATA[cc];
      const skills = cd.skills.map((s) => `<div class="preview-skill">✨ ${s.name} — ${s.desc} (${s.manaCost}MP)</div>`).join("");
      document.getElementById("char-preview-info").innerHTML = `
        <div class="preview-header">${race} ${cc}</div>
        <div class="preview-stats">HP: ${cd.hpBase} + ${cd.hpPerLvl}/lvl | Mana: ${cd.manaBase} + ${cd.manaPerLvl}/lvl | Focus: ${cd.bonusStat}</div>
        <div class="preview-skills">${skills}</div>
      `;
    };
    raceSelect.addEventListener("change", updatePreview);
    classSelect.addEventListener("change", updatePreview);

    document.getElementById("btn-reroll-stats")?.addEventListener("click", () => {
      const stats = Dice.rollStats();
      for (const [k, v] of Object.entries(stats)) {
        const el = document.getElementById("stat-" + k);
        if (el) el.textContent = `${v} (${Dice.modStr(v)})`;
      }
      document.getElementById("stat-block").dataset.stats = JSON.stringify(stats);
      Sound.diceRoll();
    });
    document.getElementById("btn-reroll-stats")?.click();
  }

  function startNewGame() {
    const name = document.getElementById("char-name")?.value.trim() || "Adventurer";
    const race = document.getElementById("char-race")?.value;
    const cc = document.getElementById("char-class")?.value;
    if (!race || !cc) return;

    const statsJson = document.getElementById("stat-block")?.dataset.stats;
    const stats = statsJson ? JSON.parse(statsJson) : Dice.rollStats();
    const permadeath = document.getElementById("opt-permadeath")?.checked || false;
    const dungeonMode = document.getElementById("opt-dungeon")?.checked || false;

    player = Character.create(name, race, cc, stats, { permadeath, dungeonMode });
    if (dungeonMode) player.dungeonFloor = 1;

    GameMap.init();
    NPCs.init();
    Journal.init();
    Achievements.init();
    turnCount = 0;

    AI.init(Character.getSummary(player));
    switchScreen("play");
    Sound.startAmbient("tavern");
    renderSidebar();
    clearNarrative();

    appendSystemMsg("🎲 *Your adventure begins...*");
    sendToAI(null, true);
  }

  /* ─── Main message flow ─── */
  function onSend() {
    const input = document.getElementById("player-input");
    const text = input?.value.trim();
    if (!text || processing) return;
    input.value = "";

    if (Combat.isActive()) {
      handleCombatInput(text);
    } else {
      appendMessage(text, "player");
      sendToAI(text);
    }
  }

  async function sendToAI(text, isFirst = false) {
    if (processing) return;
    processing = true;
    setInputEnabled(false);
    document.getElementById("quick-actions").innerHTML = "";

    const msg = isFirst ? null : text;
    let fullResponse = "";

    const msgEl = appendMessage("", "gm");

    try {
      fullResponse = await AI.sendStreaming(
        msg || "Begin the adventure.",
        Character.getSummary(player),
        (token) => {
          msgEl.querySelector(".msg-text").innerHTML = formatMarkdown(
            (fullResponse + token).replace(/```(?:combat|check|loot|quest|location|scene|npc|lore)\s*\n?[\s\S]*?```/g, "")
          );
          scrollToBottom();
        }
      );
    } catch (err) {
      console.error(err);
      fullResponse = "*(Old Greg strokes his beard uncertainly...)*";
    }

    processResponse(fullResponse);
    processing = false;
    setInputEnabled(true);
    turnCount++;
    player.turnCount = turnCount;

    // Auto-save every 3 turns
    if (turnCount % 3 === 0) autoSave();

    // Random events
    checkRandomEvents();

    // Achievements
    if (typeof Achievements !== "undefined") {
      Achievements.checkAll(player, {
        turnCount, nat20s: Dice.getNat20Count(),
        locationCount: GameMap.getLocationCount(),
        npcCount: NPCs.count(),
        loreCount: Journal.count(),
      });
    }
  }

  function processResponse(text) {
    const blocks = AI.parseBlocks(text);

    // Scene images
    if (blocks.scenes.length > 0) {
      const scene = blocks.scenes[0];
      SceneImages.show(scene.prompt, scene.mood);
    } else {
      const extracted = SceneImages.extractScenePrompt(text);
      if (extracted) SceneImages.show(extracted, SceneImages.guessMood(text));
    }

    // NPCs
    for (const npc of blocks.npcs) {
      NPCs.add(npc.name, npc.race, npc.role, npc.disposition);
      AI.updateMemory("npcsKnown", npc.name);
    }

    // Lore
    for (const lore of blocks.loreEntries) {
      Journal.add(lore.title, lore.category, lore.text);
    }

    // Locations
    for (const loc of blocks.locations) {
      GameMap.addLocation(loc.name, loc.type, loc.connections || []);
      GameMap.moveTo(loc.name);
      AI.updateMemory("locationsVisited", loc.name);
      Sound.setAmbientType(loc.type || "tavern");
    }

    // Loot
    for (const loot of blocks.loot) {
      if (loot.gold) { player.gold += loot.gold; Sound.gold(); }
      if (loot.items) { for (const i of loot.items) player.inventory.push(i); }
      if (loot.xp) {
        const leveled = Character.addXp(player, loot.xp);
        if (leveled) {
          Sound.levelUp();
          if (typeof Particles !== "undefined") Particles.burst("confetti", 30);
          showLevelUpPicker();
        }
      }
      appendSystemMsg(`💰 +${loot.gold || 0}g ${loot.items ? "| 📦 " + loot.items.join(", ") : ""} ${loot.xp ? "| ✨ +" + loot.xp + " XP" : ""}`);
    }

    // Quests
    for (const q of blocks.quests) {
      if (q.action === "add") {
        player.quests.push(q.quest);
        appendSystemMsg(`📜 New Quest: ${q.quest}`);
      } else if (q.action === "complete") {
        player.quests = player.quests.filter((x) => x !== q.quest);
        player.questsCompleted = (player.questsCompleted || 0) + 1;
        Sound.questComplete();
        appendSystemMsg(`✅ Quest Complete: ${q.quest}`);
      }
    }

    // Skill checks
    for (const check of blocks.checks) {
      resolveSkillCheck(check);
    }

    // Combat
    if (blocks.combat) {
      enterCombat(blocks.combat);
    }

    // Options
    const options = AI.parseOptions(blocks.narrative);
    if (options.length > 0 && !Combat.isActive()) renderQuickActions(options);

    renderSidebar();
    scrollToBottom();
  }

  /* ─── Combat ─── */
  function enterCombat(combatData) {
    state = "combat";
    Combat.start(combatData);
    Sound.swordHit();
    if (typeof Particles !== "undefined") Particles.burst("sparks", 10);
    renderCombatActions();
  }

  function renderCombatActions() {
    const actions = Combat.getCombatActions(player);
    const container = document.getElementById("quick-actions");
    container.innerHTML = "";
    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.className = "quick-action-btn combat-action";
      btn.textContent = action;
      btn.addEventListener("click", () => handleCombatAction(action));
      container.appendChild(btn);
    });
  }

  async function handleCombatInput(text) {
    const lower = text.toLowerCase();
    if (lower.includes("attack") || lower === "1") return handleCombatAction("⚔️ Attack");
    if (lower.includes("flee") || lower.includes("run")) return handleCombatAction("🏃 Flee");
    if (lower.includes("defend")) return handleCombatAction("🛡️ Defend");
    if (lower.includes("potion")) return handleCombatAction("🧪 Health Potion");
    // Match skill names
    for (const s of player.skills) {
      if (lower.includes(s.name.toLowerCase())) return handleCombatAction(`✨ ${s.name} [${s.manaCost}MP]`);
    }
    appendSystemMsg("⚔️ Choose a combat action from the buttons below!");
    renderCombatActions();
  }

  async function handleCombatAction(action) {
    if (processing) return;
    processing = true;
    setInputEnabled(false);

    let narrative = "";

    if (action.startsWith("⚔️")) {
      const result = await Combat.playerAttack(player);
      narrative = result.narrative;
      if (result.killed) { await handleCombatEnd(); processing = false; setInputEnabled(true); return; }
    } else if (action.startsWith("✨")) {
      const skillName = action.replace(/✨\s*/, "").replace(/\s*\[.*\]/, "");
      const idx = player.skills.findIndex((s) => s.name === skillName);
      if (idx >= 0) {
        const result = await Combat.playerSkill(player, idx);
        narrative = result.narrative;
        if (result.killed) { await handleCombatEnd(); processing = false; setInputEnabled(true); return; }
      }
    } else if (action.includes("Defend")) {
      Character.addStatus(player, "Shielded", 1);
      narrative = "🛡️ You brace for impact! (+3 AC this turn)";
    } else if (action.includes("Health Potion")) {
      const idx = player.inventory.indexOf("Health Potion");
      if (idx >= 0) {
        player.inventory.splice(idx, 1);
        const amt = Dice.roll(8).rolls[0] + 2;
        Character.heal(player, amt);
        Sound.heal();
        narrative = `🧪 Drank Health Potion — restored **${amt} HP**! (${player.hp}/${player.maxHp})`;
      } else narrative = "No Health Potions left!";
    } else if (action.includes("Mana Potion")) {
      const idx = player.inventory.indexOf("Mana Potion");
      if (idx >= 0) {
        player.inventory.splice(idx, 1);
        Character.restoreMana(player, 10);
        narrative = `🔮 Drank Mana Potion — restored 10 Mana! (${player.mana}/${player.maxMana})`;
      } else narrative = "No Mana Potions left!";
    } else if (action.includes("Flee")) {
      const check = Dice.rollAndLog(20, 1, "Flee check").rolls[0] + Dice.modifier(player.stats.DEX);
      if (check >= 12) {
        narrative = `🏃 You flee! (${check} vs DC 12)`;
        Combat.end();
        appendMessage(narrative, "combat");
        await sendToAI("I fled from combat. Describe where I end up and give me options.");
        processing = false; setInputEnabled(true); return;
      } else {
        narrative = `🏃 Failed to flee! (${check} vs DC 12)`;
      }
    }

    appendMessage(narrative, "combat");

    // Enemy turn
    Character.tickCooldowns(player);
    const statusMsgs = Character.processStatusEffects(player);
    if (statusMsgs.length > 0) appendMessage(statusMsgs.join("\n"), "combat");

    if (Combat.isActive()) {
      const result = await Combat.enemyAttack(player);
      appendMessage(result.narrative, "combat");

      if (result.playerDead) {
        await handlePlayerDeath();
      } else if (result.allEnemiesDead) {
        await handleCombatEnd();
      } else {
        renderCombatActions();
      }
    }

    renderSidebar();
    scrollToBottom();
    processing = false;
    setInputEnabled(true);
  }

  async function handleCombatEnd() {
    Combat.end();
    state = "play";
    player.pacifistCount = 0;
    Achievements.increment("combats_won");
    appendSystemMsg("⚔️ Combat ended! Waiting for the tale to continue...");
    await sendToAI("I won the combat! Describe the aftermath, give loot (```loot block), and continue the adventure.");
  }

  async function handlePlayerDeath() {
    Sound.death();
    Combat.end();
    if (player.permadeath) {
      appendSystemMsg("💀 **PERMADEATH — Your adventure ends here.** Your save has been erased.");
      Save.remove(0);
      Achievements.unlock("permadeath_loss");
      setTimeout(() => switchScreen("title"), 4000);
    } else {
      appendSystemMsg("💀 **You have fallen...** Old Greg drags you back to the tavern.");
      player.hp = Math.floor(player.maxHp / 2);
      player.mana = Math.floor(player.maxMana / 2);
      player.gold = Math.max(0, player.gold - 10);
      state = "play";
      await sendToAI("I was defeated and nearly died. Old Greg rescued me. Describe waking up back in the tavern, maybe I lost some gold. Give options.");
    }
    renderSidebar();
  }

  /* ─── Skill Checks ─── */
  function resolveSkillCheck(check) {
    const stat = check.stat || "STR";
    const dc = check.dc || 12;
    const roll = Dice.rollAndLog(20, 1, `${stat} check DC${dc}`);
    const mod = Dice.modifier(player.stats[stat] || 10);
    const total = roll.rolls[0] + mod;
    const success = total >= dc;
    Dice.showRollOverlay(roll.rolls[0], 20, 900);
    const msg = `🎲 **${check.description || stat + " Check"}**: d20(${roll.rolls[0]}) + ${mod} = **${total}** vs DC ${dc} — ${success ? "✅ **Success!**" : "❌ **Failure!**"}`;
    appendMessage(msg, "system");
    if (success && check.successXp) {
      const leveled = Character.addXp(player, check.successXp);
      if (leveled) { Sound.levelUp(); showLevelUpPicker(); }
    }
  }

  /* ─── Random Events ─── */
  function checkRandomEvents() {
    if (Combat.isActive() || turnCount < 3) return;
    const event = Events.trigger(player.level, turnCount);
    if (event) {
      const prompt = Events.getPromptForEvent(event);
      appendSystemMsg(`🌍 *${event.name}*`);
      AI.addMessage("system", `[RANDOM EVENT] ${prompt}`);
    }
  }

  /* ─── Level-Up Picker ─── */
  function showLevelUpPicker() {
    const choices = LevelUp.getChoices(player.class, player.skills.map((s) => s.name));
    LevelUp.showPicker(choices, (choice) => {
      LevelUp.applyChoice(player, choice);
      renderSidebar();
      appendSystemMsg(`🎉 Level ${player.level}! Gained: **${choice.name}**`);
    });
  }

  /* ─── Quick Actions ─── */
  function renderQuickActions(options) {
    const container = document.getElementById("quick-actions");
    container.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quick-action-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        document.getElementById("player-input").value = opt;
        onSend();
      });
      container.appendChild(btn);
    });
  }

  /* ─── Sidebar ─── */
  function renderSidebar() {
    if (!player) return;
    document.getElementById("portrait-container").innerHTML = Portraits.generate(player.race, player.class);
    document.getElementById("char-info-name").textContent = player.name;
    document.getElementById("char-info-detail").textContent = `Lv${player.level} ${player.race} ${player.class}`;

    const hpPct = (player.hp / player.maxHp * 100).toFixed(0);
    const mpPct = (player.mana / player.maxMana * 100).toFixed(0);
    const xpPct = (player.xp / player.xpToLevel * 100).toFixed(0);
    document.getElementById("hp-bar-fill").style.width = hpPct + "%";
    document.getElementById("hp-bar-text").textContent = `${player.hp}/${player.maxHp}`;
    document.getElementById("mp-bar-fill").style.width = mpPct + "%";
    document.getElementById("mp-bar-text").textContent = `${player.mana}/${player.maxMana}`;
    document.getElementById("xp-bar-fill").style.width = xpPct + "%";
    document.getElementById("xp-bar-text").textContent = `${player.xp}/${player.xpToLevel}`;

    const statsEl = document.getElementById("char-stats-grid");
    statsEl.innerHTML = Object.entries(player.stats).map(([k, v]) =>
      `<div class="stat-cell"><span class="stat-label">${k}</span><span class="stat-val">${v}</span><span class="stat-mod">${Dice.modStr(v)}</span></div>`
    ).join("");

    document.getElementById("gold-display").textContent = "💰 " + player.gold;

    // Status effects
    const statusEl = document.getElementById("status-effects");
    statusEl.innerHTML = player.statusEffects.map((e) => `<span class="status-badge" title="${e.name} (${e.duration}t)">${e.icon || "•"}</span>`).join("");

    // Skills
    const skillsEl = document.getElementById("skills-list");
    skillsEl.innerHTML = player.skills.map((s) => {
      const ready = s.currentCooldown === 0 && player.mana >= s.manaCost;
      return `<div class="skill-row ${ready ? "ready" : "cooldown"}" title="${s.desc}"><span class="skill-name">${s.name}</span><span class="skill-cost">${s.manaCost}MP${s.currentCooldown > 0 ? ` (${s.currentCooldown}t)` : ""}</span></div>`;
    }).join("");

    // Permadeath / dungeon badges
    const badges = document.getElementById("mode-badges");
    badges.innerHTML = "";
    if (player.permadeath) badges.innerHTML += '<span class="mode-badge permadeath">☠️ PERMADEATH</span>';
    if (player.dungeonMode) badges.innerHTML += `<span class="mode-badge dungeon">🏰 FLOOR ${player.dungeonFloor}/${player.dungeonMaxFloor}</span>`;
  }

  /* ─── Modals ─── */
  function openModal(id) { document.getElementById(id)?.classList.remove("hidden"); }
  function closeModal(id) { document.getElementById(id)?.classList.add("hidden"); }

  function showEquipmentModal() {
    openModal("modal-equipment");
    Equipment.render(document.getElementById("equipment-content"), player, () => { renderSidebar(); showEquipmentModal(); });
  }

  function showMapModal() {
    openModal("modal-map");
    GameMap.render(document.getElementById("map-content"));
  }

  function showJournalModal() {
    openModal("modal-journal");
    Journal.render(document.getElementById("journal-content"));
  }

  function showAchievementsModal() {
    openModal("modal-achievements");
    Achievements.render(document.getElementById("achievements-content"));
  }

  function showCodexModal() {
    openModal("modal-codex");
    NPCs.render(document.getElementById("codex-content"));
  }

  function showDiceHistoryModal() {
    openModal("modal-dice");
    Dice.renderHistory(document.getElementById("dice-history-content"));
  }

  function showSaveModal() {
    openModal("modal-save");
    const container = document.getElementById("save-content");
    container.innerHTML = "";
    const slots = Save.listSlots();
    slots.forEach((slot) => {
      const div = document.createElement("div");
      div.className = "save-slot";
      if (slot.empty) {
        div.innerHTML = `<div class="save-slot-empty">Slot ${slot.slot + 1} — Empty</div>`;
        div.addEventListener("click", () => { if (player) { Save.save(slot.slot, getGameState()); showSaveModal(); appendSystemMsg("💾 Saved!"); } });
      } else {
        div.innerHTML = `
          <div class="save-slot-info">
            <strong>${slot.name}</strong> — Lv${slot.level} ${slot.race} ${slot.class}
            ${slot.permadeath ? "☠️" : ""} ${slot.dungeonFloor ? "🏰F" + slot.dungeonFloor : ""}
            <div class="save-slot-date">${slot.date}</div>
          </div>
          <div class="save-slot-actions">
            <button class="btn-save-load" data-slot="${slot.slot}">Load</button>
            <button class="btn-save-overwrite" data-slot="${slot.slot}">Save</button>
            <button class="btn-save-delete" data-slot="${slot.slot}">🗑️</button>
          </div>
        `;
      }
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-save-load").forEach((btn) => {
      btn.addEventListener("click", (e) => { loadGame(parseInt(e.target.dataset.slot)); closeModal("modal-save"); });
    });
    container.querySelectorAll(".btn-save-overwrite").forEach((btn) => {
      btn.addEventListener("click", (e) => { if (player) { Save.save(parseInt(e.target.dataset.slot), getGameState()); showSaveModal(); appendSystemMsg("💾 Saved!"); } });
    });
    container.querySelectorAll(".btn-save-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => { Save.remove(parseInt(e.target.dataset.slot)); showSaveModal(); });
    });
  }

  function showLoadModal() {
    openModal("modal-save");
    showSaveModal();
  }

  function showSettingsModal() {
    openModal("modal-settings");
  }

  /* ─── Save / Load ─── */
  function getGameState() {
    return {
      player, conversationHistory: AI.getConversationHistory(),
      mapData: GameMap.getData(), turnCount,
      npcData: NPCs.getData(), journalData: Journal.getData(),
      eventsData: Events.getData(), worldMemory: AI.getWorldMemory(),
    };
  }

  function loadGame(slot) {
    const data = Save.load(slot);
    if (!data) { appendSystemMsg("Failed to load save."); return; }
    player = data.player;
    turnCount = data.turnCount || 0;
    if (data.conversationHistory) AI.setConversationHistory(data.conversationHistory);
    if (data.mapData) GameMap.restore(data.mapData);
    if (data.npcData) NPCs.restore(data.npcData);
    if (data.journalData) Journal.restore(data.journalData);
    if (data.eventsData) Events.restore(data.eventsData);
    if (data.worldMemory) AI.setWorldMemory(data.worldMemory);
    switchScreen("play");
    clearNarrative();
    renderSidebar();
    Sound.startAmbient(GameMap.getCurrentType());
    appendSystemMsg(`📂 Loaded: ${player.name} — Lv${player.level} ${player.race} ${player.class}`);
    // Reload scene image
    SceneImages.show("Medieval fantasy scene, " + GameMap.getCurrent(), "warm");
  }

  function autoSave() {
    if (player) Save.autoSave(getGameState());
  }

  /* ─── Inventory ─── */
  function toggleInventory() {
    const panel = document.getElementById("inventory-panel");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) renderInventory();
  }

  function renderInventory() {
    const container = document.getElementById("inventory-list");
    container.innerHTML = "";
    if (player.inventory.length === 0) {
      container.innerHTML = '<div class="inv-empty">Empty</div>';
      return;
    }
    player.inventory.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "inv-item";
      const equippable = Equipment.isEquippable(item);
      div.innerHTML = `<span>${item}</span>`;
      if (equippable) {
        const btn = document.createElement("button");
        btn.textContent = "Equip";
        btn.className = "inv-equip-btn";
        btn.addEventListener("click", () => { Equipment.equip(player, item); renderSidebar(); renderInventory(); });
        div.appendChild(btn);
      }
      if (item.includes("Potion")) {
        const btn = document.createElement("button");
        btn.textContent = "Use";
        btn.className = "inv-use-btn";
        btn.addEventListener("click", () => useItem(idx));
        div.appendChild(btn);
      }
      container.appendChild(div);
    });
  }

  function useItem(idx) {
    const item = player.inventory[idx];
    if (!item) return;
    if (item === "Health Potion" || item === "Greater Health Potion") {
      const amt = item.includes("Greater") ? Dice.roll(8, 2).total + 4 : Dice.roll(8).rolls[0] + 2;
      Character.heal(player, amt);
      player.inventory.splice(idx, 1);
      Sound.heal();
      appendSystemMsg(`🧪 Used ${item} — restored ${amt} HP!`);
    } else if (item === "Mana Potion") {
      Character.restoreMana(player, 10);
      player.inventory.splice(idx, 1);
      Sound.heal();
      appendSystemMsg(`🔮 Used Mana Potion — restored 10 MP!`);
    }
    renderSidebar();
    renderInventory();
  }

  function toggleQuests() {
    const panel = document.getElementById("quests-panel");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) {
      const container = document.getElementById("quests-list");
      container.innerHTML = player.quests.length === 0
        ? '<div class="quest-empty">No active quests</div>'
        : player.quests.map((q) => `<div class="quest-item">📜 ${q}</div>`).join("");
    }
  }

  /* ─── Quick Roll ─── */
  function quickRoll() {
    const r = Dice.rollAndLog(20, 1, "Quick roll");
    Dice.showRollOverlay(r.rolls[0], 20);
    appendSystemMsg(`🎲 Quick roll: **d20 = ${r.rolls[0]}**`);
  }

  /* ─── Chat ─── */
  function appendMessage(text, sender = "gm") {
    const log = document.getElementById("narrative-log");
    const div = document.createElement("div");
    div.className = `msg msg-${sender}`;
    div.innerHTML = `<div class="msg-text">${formatMarkdown(text.replace(/```(?:combat|check|loot|quest|location|scene|npc|lore)\s*\n?[\s\S]*?```/g, ""))}</div>`;
    log.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendSystemMsg(text) {
    return appendMessage(text, "system");
  }

  function clearNarrative() {
    const log = document.getElementById("narrative-log");
    if (log) log.innerHTML = "";
  }

  function scrollToBottom() {
    const log = document.getElementById("narrative-log");
    if (log) log.scrollTop = log.scrollHeight;
  }

  function setInputEnabled(enabled) {
    const input = document.getElementById("player-input");
    const btn = document.getElementById("btn-send");
    if (input) input.disabled = !enabled;
    if (btn) btn.disabled = !enabled;
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/"(.+?)"/g, '<span class="dialogue">"$1"</span>')
      .replace(/\n/g, "<br>");
  }

  /* ─── Close modal buttons (delegated) ─── */
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-close")) {
      e.target.closest(".modal")?.classList.add("hidden");
    }
    if (e.target.classList.contains("modal-overlay")) {
      e.target.closest(".modal")?.classList.add("hidden");
    }
  });

  return { init };
})();

document.addEventListener("DOMContentLoaded", Game.init);
