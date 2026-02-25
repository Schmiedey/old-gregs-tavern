/* ═══════════════════════════════════════════════════════
   game.js — Main game controller: wires all systems,
   streaming typewriter, save/load, shop, map, multiplayer
   ═══════════════════════════════════════════════════════ */
(() => {
  "use strict";

  let player = null;
  let selectedRace = null;
  let selectedClass = null;
  let currentStats = null;
  let isProcessing = false;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const screens = { title: $("#title-screen"), char: $("#char-screen"), game: $("#game-screen") };
  const ui = {
    charName: $("#char-name"), raceGrid: $("#race-grid"), classGrid: $("#class-grid"),
    statBlock: $("#stat-block"), btnReroll: $("#btn-reroll"), btnStart: $("#btn-start-adventure"),
    messages: $("#messages"), narrativeLog: $("#narrative-log"), quickActions: $("#quick-actions"),
    playerInput: $("#player-input"), btnSend: $("#btn-send"), sidebar: $("#sidebar"),
    btnToggle: $("#btn-toggle-sidebar"),
  };

  /* ═══════ SCREEN MANAGEMENT ═══════ */
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  /* ═══════ SETTINGS (API key, model, sound) ═══════ */
  function loadSettings() {
    const s = Save.getSettings();
    if (s.apiKey) $("#settings-key").value = s.apiKey;
    if (s.model) $("#settings-model").value = s.model;
    if (s.sound === false) { Sound.toggle(); $("#settings-sound").checked = false; }
    applySettings();
  }

  function applySettings() {
    const key = $("#settings-key").value.trim();
    const model = $("#settings-model").value;
    AI.configure(key, model, isLocal);
  }

  function saveSettings() {
    Save.saveSettings({
      apiKey: $("#settings-key").value.trim(),
      model: $("#settings-model").value,
      sound: $("#settings-sound").checked,
    });
    applySettings();
  }

  /* ═══════ TITLE SCREEN ═══════ */
  $("#btn-new-game").addEventListener("click", () => {
    const key = Save.getSettings().apiKey || "";
    if (!key && !isLocal) { toggleModal("settings-modal", true); return; }
    showScreen("char");
  });

  $("#btn-load-game").addEventListener("click", () => toggleModal("save-modal", true));
  $("#btn-settings").addEventListener("click", () => toggleModal("settings-modal", true));
  $("#btn-multiplayer").addEventListener("click", () => toggleModal("mp-modal", true));

  /* ═══════ SETTINGS MODAL ═══════ */
  $("#settings-save").addEventListener("click", () => {
    saveSettings();
    toggleModal("settings-modal", false);
    // If came from "New Adventure" with no key, proceed
    if (!player) showScreen("char");
  });

  /* ═══════ MODAL HELPER ═══════ */
  function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !show);
  }
  $$(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".modal-overlay").classList.add("hidden"));
  });

  /* ═══════ SAVE / LOAD ═══════ */
  function renderSaveSlots() {
    const container = $("#save-slots");
    container.innerHTML = "";
    const slots = Save.listSlots();
    for (const s of slots) {
      const div = document.createElement("div");
      div.className = "save-slot";
      if (s.empty) {
        div.innerHTML = `<span class="save-slot-label">Slot ${s.slot + 1} — Empty</span>`;
        if (player) {
          const saveBtn = document.createElement("button");
          saveBtn.className = "btn btn-sm";
          saveBtn.textContent = "💾 Save";
          saveBtn.onclick = () => {
            Save.save(s.slot, { player, conversationHistory: AI.getConversationHistory(), mapData: GameMap.getData(), turnCount: player.turnCount });
            renderSaveSlots();
          };
          div.appendChild(saveBtn);
        }
      } else {
        div.innerHTML = `<span class="save-slot-label">Slot ${s.slot + 1} — ${s.name} (Lv${s.level} ${s.race} ${s.class})</span><span class="save-slot-date">${s.date}</span>`;
        const loadBtn = document.createElement("button");
        loadBtn.className = "btn btn-sm"; loadBtn.textContent = "📂 Load";
        loadBtn.onclick = () => loadGame(s.slot);
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-sm"; delBtn.textContent = "🗑️";
        delBtn.onclick = () => { Save.remove(s.slot); renderSaveSlots(); };
        div.appendChild(loadBtn);
        div.appendChild(delBtn);
      }
      container.appendChild(div);
    }
  }
  // Render save slots when modal opens
  const saveMO = new MutationObserver(() => {
    if (!document.getElementById("save-modal").classList.contains("hidden")) renderSaveSlots();
  });
  setTimeout(() => {
    const sm = document.getElementById("save-modal");
    if (sm) saveMO.observe(sm, { attributes: true, attributeFilter: ["class"] });
  }, 100);

  function loadGame(slot) {
    const data = Save.load(slot);
    if (!data) return;
    player = data.player;
    AI.setConversationHistory(data.conversationHistory || []);
    GameMap.restore(data.mapData);
    toggleModal("save-modal", false);

    const settings = Save.getSettings();
    AI.configure(settings.apiKey || "", settings.model || "google/gemini-2.0-flash-001", isLocal);

    showScreen("game");
    updateSidebar();
    Sound.startAmbient();
    addMessage("system", null, `📂 Loaded save: **${player.name}** — Level ${player.level} ${player.race} ${player.class}`);
    setQuickActions(["🔍 Look around", "🗣️ Talk to someone", "⚔️ Look for trouble", "🍺 Order a drink"]);
  }

  /* ═══════ CHARACTER CREATION ═══════ */
  function setupOptionGrid(grid, cb) {
    grid.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        grid.querySelectorAll(".opt-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        cb(btn.dataset.value);
      });
    });
  }
  setupOptionGrid(ui.raceGrid, (v) => { selectedRace = v; checkCharReady(); });
  setupOptionGrid(ui.classGrid, (v) => { selectedClass = v; rollAndShowStats(); checkCharReady(); });

  function rollAndShowStats() {
    currentStats = Dice.rollStats();
    for (const [key, val] of Object.entries(currentStats)) {
      const el = $(`#stat-${key.toLowerCase()}`);
      if (el) el.textContent = val;
    }
    ui.statBlock.classList.remove("hidden");
  }
  ui.btnReroll.addEventListener("click", rollAndShowStats);
  function checkCharReady() {
    ui.btnStart.disabled = !(ui.charName.value.trim() && selectedRace && selectedClass && currentStats);
  }
  ui.charName.addEventListener("input", checkCharReady);

  ui.btnStart.addEventListener("click", async () => {
    const name = ui.charName.value.trim() || "Adventurer";
    player = Character.create(name, selectedRace, selectedClass, currentStats);
    GameMap.init();
    updateSidebar();
    showScreen("game");
    Sound.startAmbient();

    const settings = Save.getSettings();
    AI.configure(settings.apiKey || "", settings.model || "google/gemini-2.0-flash-001", isLocal);
    AI.init(Character.getSummary(player));

    const msgDiv = createStreamingMessage();
    const reply = await AI.sendStreaming("I walk into the tavern.", Character.getSummary(player), (token) => {
      appendToStreamingMessage(msgDiv, token);
    });
    finalizeStreamingMessage(msgDiv, reply);
  });

  /* ═══════ SIDEBAR ═══════ */
  function updateSidebar() {
    if (!player) return;
    $("#sb-name").textContent = player.name;
    $("#sb-race-class").textContent = `${player.race} ${player.class}`;
    $("#sb-level").textContent = `Lvl ${player.level}`;

    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    $("#hp-bar").style.width = hpPct + "%";
    $("#hp-text").textContent = `${player.hp} / ${player.maxHp}`;

    const mpPct = Math.max(0, (player.mana / player.maxMana) * 100);
    $("#mana-bar").style.width = mpPct + "%";
    $("#mana-text").textContent = `${player.mana} / ${player.maxMana}`;

    const xpPct = Math.max(0, (player.xp / player.xpToLevel) * 100);
    $("#xp-bar").style.width = xpPct + "%";
    $("#xp-text").textContent = `XP ${player.xp} / ${player.xpToLevel}`;

    $("#sb-stats").innerHTML = Object.entries(player.stats)
      .map(([k, v]) => `<div class="sb-stat-item"><span class="label">${k}</span><span class="value">${v} (${Dice.modStr(v)})</span></div>`)
      .join("");

    // Status effects
    const efEl = $("#sb-effects");
    if (player.statusEffects.length === 0) { efEl.innerHTML = '<span class="empty">None</span>'; }
    else { efEl.innerHTML = player.statusEffects.map((e) => `<span class="status-tag">${e.icon || "•"} ${e.name} (${e.duration}t)</span>`).join(" "); }

    const invEl = $("#sb-inventory");
    invEl.innerHTML = player.inventory.length === 0 ? '<li class="empty">Empty</li>' : player.inventory.map((i) => `<li>• ${i}</li>`).join("");

    const qEl = $("#sb-quests");
    qEl.innerHTML = player.quests.length === 0 ? '<li class="empty">None yet</li>' : player.quests.map((q) => `<li>📜 ${q}</li>`).join("");

    $("#sb-gold").textContent = player.gold;
  }

  ui.btnToggle.addEventListener("click", () => {
    ui.sidebar.classList.toggle("collapsed");
    ui.btnToggle.textContent = ui.sidebar.classList.contains("collapsed") ? "▶" : "◀";
  });

  /* ═══════ MESSAGES ═══════ */
  function addMessage(type, author, content) {
    const div = document.createElement("div");
    div.className = "msg msg-" + type;
    if (author) { const a = document.createElement("div"); a.className = "msg-author"; a.textContent = author; div.appendChild(a); }
    const b = document.createElement("div");
    b.className = "msg-body";
    b.innerHTML = md(content);
    div.appendChild(b);
    ui.messages.appendChild(div);
    scrollToBottom();
  }

  function createStreamingMessage() {
    const div = document.createElement("div");
    div.className = "msg msg-gm";
    const a = document.createElement("div");
    a.className = "msg-author";
    a.textContent = "🍺 Old Greg";
    div.appendChild(a);
    const b = document.createElement("div");
    b.className = "msg-body streaming";
    b.innerHTML = '<span class="cursor">▊</span>';
    div.appendChild(b);
    ui.messages.appendChild(div);
    scrollToBottom();
    return div;
  }

  let streamRaw = "";
  function appendToStreamingMessage(div, token) {
    streamRaw += token;
    const body = div.querySelector(".msg-body");
    body.innerHTML = md(streamRaw) + '<span class="cursor">▊</span>';
    scrollToBottom();
  }

  function finalizeStreamingMessage(div, fullText) {
    streamRaw = "";
    const body = div.querySelector(".msg-body");
    // Clean code blocks from display, parse for mechanics
    const parsed = AI.parseBlocks(fullText);
    body.innerHTML = md(parsed.narrative);
    body.classList.remove("streaming");
    handleGMBlocks(parsed);

    // Multiplayer: broadcast narrative
    if (Multiplayer.isHosting()) Multiplayer.sendNarrative(fullText, "🍺 Old Greg");
  }

  function scrollToBottom() {
    requestAnimationFrame(() => { ui.narrativeLog.scrollTop = ui.narrativeLog.scrollHeight; });
  }

  function md(text) {
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
    for (const opt of options) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => { if (!isProcessing) sendPlayerAction(opt); });
      ui.quickActions.appendChild(btn);
    }
  }

  /* ═══════ HANDLE GM RESPONSE BLOCKS ═══════ */
  function handleGMBlocks(parsed) {
    // Quests
    for (const q of parsed.quests) {
      if (q.action === "add" && q.quest && !player.quests.includes(q.quest)) {
        player.quests.push(q.quest);
        Sound.questComplete();
        addMessage("system", null, `📜 New Quest: **${q.quest}**`);
      } else if (q.action === "complete") {
        player.quests = player.quests.filter((x) => x !== q.quest);
        Sound.questComplete();
        addMessage("system", null, `✅ Quest Complete: **${q.quest}**`);
      }
    }

    // Locations
    for (const loc of parsed.locations) {
      if (loc.name) {
        GameMap.addLocation(loc.name, loc.type, loc.connections || []);
        GameMap.moveTo(loc.name);
        AI.updateMemory("locationsVisited", loc.name);
      }
    }

    // Loot
    for (const l of parsed.loot) {
      if (l.gold) { player.gold += l.gold; Sound.gold(); }
      if (l.items) player.inventory.push(...l.items);
      if (l.xp) {
        const leveled = Character.addXp(player, l.xp);
        if (leveled) { Sound.levelUp(); addMessage("system", null, `🎉 **LEVEL UP!** Level ${player.level}! HP & Mana restored.`); }
      }
      const parts = [];
      if (l.gold) parts.push(`💰 ${l.gold}g`);
      if (l.items?.length) parts.push(`🎒 ${l.items.join(", ")}`);
      if (l.xp) parts.push(`✨ ${l.xp} XP`);
      if (parts.length) addMessage("system", null, `Loot: ${parts.join(" | ")}`);
    }

    // Checks
    for (const c of parsed.checks) handleSkillCheck(c);

    // Combat
    if (parsed.combat) {
      Combat.start(parsed.combat);
      const names = Combat.getAliveEnemies().map((e) => `**${e.name}** (HP:${e.hp} AC:${e.ac})`).join(", ");
      addMessage("combat", "⚔️ Combat", `Enemies: ${names}`);
      setQuickActions(Combat.getCombatActions(player));
    } else {
      const opts = AI.parseOptions(parsed.narrative);
      setQuickActions(opts.length > 0 ? opts : ["🔍 Look around", "🗣️ Talk to someone", "⚔️ Look for trouble"]);
    }

    updateSidebar();
    autoSave();
  }

  /* ═══════ SKILL CHECKS ═══════ */
  async function handleSkillCheck(check) {
    const stat = check.stat || "DEX";
    const dc = check.dc || 12;
    const roll = Dice.rollAndLog(20, 1, `${stat} check DC ${dc}`).rolls[0];
    const mod = Dice.modifier(player.stats[stat] || 10);
    const total = roll + mod;
    const success = total >= dc;

    await Dice.showRollOverlay(roll, 20, 1000);

    const msg = success
      ? `✅ **${check.description || "Check"}** — 🎲${roll}+${mod}=${total} vs DC ${dc} — **Success!**`
      : `❌ **${check.description || "Check"}** — 🎲${roll}+${mod}=${total} vs DC ${dc} — **Failure!**`;
    addMessage("system", null, msg);
    AI.addMessage("system", `Skill check: ${stat} DC ${dc}. Rolled ${roll}+${mod}=${total}. ${success ? "SUCCESS" : "FAILURE"}.`);
  }

  /* ═══════ COMBAT ACTIONS ═══════ */
  async function handleCombatAction(action) {
    const lower = action.toLowerCase();

    // Process player status effects at start of their turn
    const statusMsgs = Character.processStatusEffects(player);
    for (const m of statusMsgs) addMessage("system", null, m);
    Character.tickCooldowns(player);

    if (Character.isStunned(player)) {
      addMessage("combat", "⚔️", "You are **Stunned** and can't act!");
      const er = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️", er.narrative);
      updateSidebar();
      if (er.playerDead) { handlePlayerDeath(); return; }
      setQuickActions(Combat.getCombatActions(player));
      return;
    }

    if (lower.includes("attack")) {
      const r = await Combat.playerAttack(player);
      addMessage("combat", "⚔️", r.narrative);
      if (r.killed) { await handleVictory(); return; }
      const er = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️", er.narrative);
      updateSidebar();
      if (er.playerDead) { handlePlayerDeath(); return; }
      if (er.allEnemiesDead) { await handleVictory(); return; }
      setQuickActions(Combat.getCombatActions(player));
    } else if (lower.startsWith("✨")) {
      // Skill usage — match by name
      const skillName = action.replace(/✨\s*/, "").replace(/\s*\[\d+MP\]/, "").trim();
      const idx = player.skills.findIndex((s) => s.name === skillName);
      if (idx === -1) { addMessage("system", null, "Unknown skill!"); return; }
      const r = await Combat.playerSkill(player, idx);
      addMessage("combat", "⚔️", r.narrative);
      if (r.killed) { await handleVictory(); return; }
      const er = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️", er.narrative);
      updateSidebar();
      if (er.playerDead) { handlePlayerDeath(); return; }
      if (er.allEnemiesDead) { await handleVictory(); return; }
      setQuickActions(Combat.getCombatActions(player));
    } else if (lower.includes("defend")) {
      player.ac += 2;
      addMessage("combat", "⚔️", `🛡️ You defend! (+2 AC → ${player.ac + Character.getACBonus(player)})`);
      const er = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️", er.narrative);
      player.ac -= 2;
      updateSidebar();
      if (er.playerDead) { handlePlayerDeath(); return; }
      setQuickActions(Combat.getCombatActions(player));
    } else if (lower.includes("health potion")) {
      const idx = player.inventory.indexOf("Health Potion");
      if (idx !== -1) {
        player.inventory.splice(idx, 1);
        const h = Dice.roll(8).rolls[0] + 2;
        Character.heal(player, h); Sound.heal();
        addMessage("combat", "⚔️", `🧪 Heal **${h} HP**! (${player.hp}/${player.maxHp})`);
      } else { addMessage("system", null, "No Health Potions!"); }
      const er = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️", er.narrative);
      updateSidebar();
      if (er.playerDead) { handlePlayerDeath(); return; }
      setQuickActions(Combat.getCombatActions(player));
    } else if (lower.includes("mana potion")) {
      const idx = player.inventory.indexOf("Mana Potion");
      if (idx !== -1) {
        player.inventory.splice(idx, 1);
        Character.restoreMana(player, 10); Sound.heal();
        addMessage("combat", "⚔️", `🔮 Restore **10 Mana**! (${player.mana}/${player.maxMana})`);
      } else { addMessage("system", null, "No Mana Potions!"); }
      const er = await Combat.enemyAttack(player);
      addMessage("combat", "⚔️", er.narrative);
      updateSidebar();
      if (er.playerDead) { handlePlayerDeath(); return; }
      setQuickActions(Combat.getCombatActions(player));
    } else if (lower.includes("flee")) {
      const roll = Dice.rollAndLog(20, 1, "Flee attempt").rolls[0];
      const dexMod = Dice.modifier(player.stats.DEX);
      await Dice.showRollOverlay(roll, 20, 1000);
      if (roll + dexMod >= 12) {
        Combat.end();
        addMessage("combat", "⚔️", `🏃 Fled! (🎲${roll}+${dexMod}=${roll + dexMod} vs DC 12)`);
        const msgDiv = createStreamingMessage();
        const reply = await AI.sendStreaming("I fled combat. What next?", Character.getSummary(player), (t) => appendToStreamingMessage(msgDiv, t));
        finalizeStreamingMessage(msgDiv, reply);
      } else {
        addMessage("combat", "⚔️", `🏃 Can't escape! (🎲${roll}+${dexMod}=${roll + dexMod} vs DC 12)`);
        const er = await Combat.enemyAttack(player);
        addMessage("combat", "⚔️", er.narrative);
        updateSidebar();
        if (er.playerDead) { handlePlayerDeath(); return; }
        setQuickActions(Combat.getCombatActions(player));
      }
    }
  }

  async function handleVictory() {
    const msgDiv = createStreamingMessage();
    const reply = await AI.sendStreaming("I won the fight! Narrate victory and give loot.", Character.getSummary(player), (t) => appendToStreamingMessage(msgDiv, t));
    finalizeStreamingMessage(msgDiv, reply);
  }

  function handlePlayerDeath() {
    Sound.death();
    Combat.end();
    addMessage("system", null, "💀 **You have fallen…**\n\n*Old Greg drags you to the fire. You awaken, alive but weakened.*");
    player.hp = Math.floor(player.maxHp / 2);
    player.mana = Math.floor(player.maxMana / 2);
    player.gold = Math.max(0, player.gold - 5);
    player.statusEffects = [];
    updateSidebar();
    setQuickActions(["🍺 Thank Old Greg", "💪 I need to get stronger", "🛒 Visit the shop"]);
  }

  /* ═══════ PLAYER INPUT ═══════ */
  async function sendPlayerAction(text) {
    if (!text.trim() || isProcessing) return;
    isProcessing = true;
    addMessage("player", `🗡️ ${player.name}`, text);

    // Multiplayer: broadcast action
    if (Multiplayer.isConnected()) Multiplayer.sendAction(text);

    if (Combat.isActive()) { await handleCombatAction(text); isProcessing = false; return; }

    // Check for special commands
    if (text.toLowerCase().includes("shop") || text.toLowerCase().includes("merchant") || text.toLowerCase().includes("buy") || text.toLowerCase().includes("sell")) {
      openShop();
      isProcessing = false;
      return;
    }

    player.turnCount++;
    const msgDiv = createStreamingMessage();
    const reply = await AI.sendStreaming(text, Character.getSummary(player), (t) => appendToStreamingMessage(msgDiv, t));
    finalizeStreamingMessage(msgDiv, reply);
    isProcessing = false;
  }

  ui.btnSend.addEventListener("click", () => {
    const t = ui.playerInput.value.trim();
    ui.playerInput.value = "";
    sendPlayerAction(t);
  });
  ui.playerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ui.btnSend.click(); }
  });

  /* ═══════ DICE BUTTONS & HISTORY ═══════ */
  $$(".btn-dice").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sides = parseInt(btn.dataset.sides, 10);
      const r = Dice.rollAndLog(sides, 1, "Manual d" + sides);
      await Dice.showRollOverlay(r.rolls[0], sides, 1100);
      addMessage("system", null, `🎲 d${sides}: **${r.rolls[0]}**`);
    });
  });
  $("#btn-dice-history")?.addEventListener("click", () => {
    toggleModal("dice-modal", true);
    Dice.renderHistory($("#dice-history-list"));
  });

  /* ═══════ SHOP ═══════ */
  function openShop() {
    Sound.shop();
    Shop.generateStock();
    toggleModal("shop-modal", true);
    renderShop();
  }
  function renderShop() {
    Shop.render($("#shop-content"), player, (idx) => {
      const r = Shop.buy(player, idx);
      addMessage("system", null, r.message);
      if (r.success) Sound.gold();
      updateSidebar();
      renderShop();
    }, (idx) => {
      const r = Shop.sell(player, idx);
      addMessage("system", null, r.message);
      if (r.success) Sound.gold();
      updateSidebar();
      renderShop();
    });
  }
  $("#btn-shop")?.addEventListener("click", openShop);

  /* ═══════ MAP ═══════ */
  $("#btn-map")?.addEventListener("click", () => {
    toggleModal("map-modal", true);
    GameMap.render($("#map-content"));
  });

  /* ═══════ AUTO-SAVE ═══════ */
  function autoSave() {
    if (player) Save.autoSave({ player, conversationHistory: AI.getConversationHistory(), mapData: GameMap.getData(), turnCount: player.turnCount });
  }

  /* ═══════ GAME TOOLBAR ═══════ */
  $("#btn-save-game")?.addEventListener("click", () => { toggleModal("save-modal", true); renderSaveSlots(); });
  $("#btn-game-settings")?.addEventListener("click", () => toggleModal("settings-modal", true));

  /* ═══════ MULTIPLAYER ═══════ */
  $("#mp-host")?.addEventListener("click", () => {
    const name = player?.name || "Host";
    Multiplayer.init(name, {
      onMessage: handleMPMessage,
      onPlayerJoin: (conn) => {
        addMessage("system", null, "🎮 A player joined your session!");
        if (player) Multiplayer.sendGameState({ player: { name: player.name, level: player.level, race: player.race, class: player.class } });
      },
      onPlayerLeave: () => addMessage("system", null, "🎮 A player left."),
    });
    Multiplayer.host((code) => {
      $("#mp-room-code").textContent = code;
      $("#mp-room-display").classList.remove("hidden");
      addMessage("system", null, `🎮 Hosting! Room code: **${code}**`);
    });
  });

  $("#mp-join-btn")?.addEventListener("click", () => {
    const code = $("#mp-join-code").value.trim();
    if (!code) return;
    Multiplayer.init(player?.name || "Guest", {
      onMessage: handleMPMessage,
    });
    Multiplayer.join(code, () => {
      toggleModal("mp-modal", false);
      addMessage("system", null, "🎮 Connected to host!");
    });
  });

  function handleMPMessage(type, data) {
    if (type === "player-action" && Multiplayer.isHosting()) {
      addMessage("player", `🗡️ ${data.name}`, data.text);
      // Host processes the action through AI
      sendPlayerAction(data.text);
    } else if (type === "narrative") {
      const parsed = AI.parseBlocks(data.text);
      addMessage("gm", data.author || "🍺 Old Greg", parsed.narrative);
      handleGMBlocks(parsed);
    } else if (type === "system") {
      addMessage("system", null, data.message);
    }
  }

  /* ═══════ INIT ═══════ */
  loadSettings();
  GameMap.init();
  showScreen("title");
})();
