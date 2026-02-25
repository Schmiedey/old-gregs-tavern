/* ═══════════════════════════════════════════
   game.js — Main game controller
   Init, game loop, screen management,
   transitions, input handling orchestration.
   ═══════════════════════════════════════════ */

const Game = (() => {
  let charData = null;
  let running = false;
  let lastTime = 0;
  let paused = false;
  let currentScreen = "title"; // title | create | play

  /* ─── Initialization ─── */
  function init() {
    Renderer.init();
    Input.init();
    Sprites.init();

    // Wire up title screen
    document.getElementById("btn-new-game").onclick = () => {
      Sound.ensureCtx();
      switchScreen("create");
    };
    document.getElementById("btn-load-game").onclick = () => {
      Sound.ensureCtx();
      const saves = Save.listSlots();
      const latest = saves.find(s => !s.empty);
      if (latest) loadGame(latest.slot);
      else HUD.toast("No saves found!", "#ff6666");
    };

    // Populate race/class dropdowns
    populateDropdowns();

    // Wire up character creation
    document.getElementById("btn-start-adventure").onclick = () => {
      createCharacter();
    };
    document.getElementById("btn-back-title").onclick = () => {
      switchScreen("title");
    };
    const rerollBtn = document.getElementById("btn-reroll-stats");
    if (rerollBtn) rerollBtn.onclick = rerollStats;
    rerollStats();

    // Wire up toolbar buttons
    document.getElementById("btn-hud-inventory").onclick = () => HUD.showInventory(charData);
    document.getElementById("btn-hud-equipment").onclick = () => HUD.showEquipment(charData);
    document.getElementById("btn-hud-map").onclick = () => HUD.showMap();
    document.getElementById("btn-hud-journal").onclick = () => HUD.showJournal();
    document.getElementById("btn-hud-quests").onclick = () => HUD.showQuests(charData);
    document.getElementById("btn-hud-save").onclick = () => HUD.showSave(charData, getState);
    document.getElementById("btn-hud-sound").onclick = toggleSettings;

    // Wire up modal close
    document.getElementById("modal-close-btn").onclick = () => HUD.closeModal();

    // ESC key closes modal
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && HUD.isModalOpen()) {
        HUD.closeModal();
        e.preventDefault();
      }
    });

    console.log("🍺 Old Greg's Tavern v4 — 2D engine initialized");
  }

  function populateDropdowns() {
    const raceSelect = document.getElementById("char-race");
    const classSelect = document.getElementById("char-class");
    if (raceSelect) {
      Object.keys(Character.RACE_DATA).forEach(race => {
        const opt = document.createElement("option");
        opt.value = race; opt.textContent = race;
        raceSelect.appendChild(opt);
      });
    }
    if (classSelect) {
      Object.keys(Character.CLASS_DATA).forEach(cls => {
        const opt = document.createElement("option");
        opt.value = cls; opt.textContent = cls;
        classSelect.appendChild(opt);
      });
    }
  }

  function rerollStats() {
    const stats = Dice.rollStats(); // returns {STR:n, DEX:n, ...}
    const names = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    names.forEach(name => {
      const el = document.getElementById("stat-" + name);
      if (el) {
        const val = stats[name];
        const mod = Math.floor((val - 10) / 2);
        const sign = mod >= 0 ? "+" : "";
        el.textContent = `${val} (${sign}${mod})`;
      }
    });
    // Store on stat-block for later
    const block = document.getElementById("stat-block");
    if (block) {
      block.dataset.stats = JSON.stringify(stats);
    }
  }

  /* ─── Screen management ─── */
  function switchScreen(name) {
    document.querySelectorAll(".screen").forEach(s => {
      s.classList.add("hidden");
      s.classList.remove("active");
    });
    const el = document.getElementById(name + "-screen");
    if (el) {
      el.classList.remove("hidden");
      el.classList.add("active");
    }
    currentScreen = name;

    if (name === "play" && !running) startGameLoop();
  }

  /* ─── Character creation ─── */
  function createCharacter() {
    const name = document.getElementById("char-name").value.trim() || randomName();
    const race = document.getElementById("char-race").value;
    const cls = document.getElementById("char-class").value;

    if (!race || !cls) {
      HUD.toast("Pick a race and class!", "#ff6666");
      return;
    }

    // Get rolled stats
    let baseStats = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    const block = document.getElementById("stat-block");
    if (block && block.dataset.stats && block.dataset.stats !== "{}") {
      try { baseStats = JSON.parse(block.dataset.stats); } catch {}
    }

    const options = {
      permadeath: document.getElementById("opt-permadeath")?.checked || false,
      dungeonMode: document.getElementById("opt-dungeon")?.checked || false,
    };
    charData = Character.create(name, race, cls, baseStats, options);

    charData.inventory = ["Health Potion", "Health Potion", "Rusty Dagger"];
    charData.quests = [];
    charData.gold = 10;

    // Init player sprite and position
    const spawn = World.loadMap("tavern", "default");
    Player.init(race, cls, spawn);
    Camera.snapTo(spawn.x * Sprites.TILE, spawn.y * Sprites.TILE);

    Sound.playAmbient("tavern");
    HUD.toast(`Welcome, ${name} the ${race} ${cls}!`, "#ffd700");

    switchScreen("play");
  }

  /* ─── Save / Load ─── */
  function getState() {
    return {
      charData,
      mapId: World.getCurrentId(),
      playerPos: Player.getTilePos(),
      visited: World.getVisited(),
      conversationHistory: AI.getHistory(),
    };
  }

  function loadGame(slot) {
    const state = Save.load(slot);
    if (!state) { HUD.toast("Failed to load!", "#ff6666"); return; }

    charData = state.charData;
    if (state.conversationHistory) AI.setHistory(state.conversationHistory);

    const spawn = World.loadMap(state.mapId || "tavern", "default");
    const pos = state.playerPos || spawn;
    Player.init(charData.race, charData.class, pos);
    Camera.snapTo(pos.x * Sprites.TILE, pos.y * Sprites.TILE);

    if (state.visited) World.setVisited(state.visited);

    Sound.playAmbient(World.getCurrentType());
    HUD.toast("Game loaded!", "#66ff66");
    switchScreen("play");
  }

  /* ─── Map transitions ─── */
  function transitionTo(mapId, spawnId) {
    if (paused) return;
    paused = true;

    Renderer.startFadeOut(() => {
      const spawn = World.loadMap(mapId, spawnId || "default");
      Player.respawn(spawn);
      Camera.snapTo(spawn.x * Sprites.TILE, spawn.y * Sprites.TILE);
      Sound.playAmbient(World.getCurrentType());

      Renderer.startFadeIn();
      paused = false;
      HUD.toast(`📍 ${World.getCurrentName()}`, "#d4d0c8");
    });
  }

  /* ─── Game loop ─── */
  function startGameLoop() {
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(timestamp) {
    if (!running) return;
    requestAnimationFrame(loop);

    const dt = Math.min(timestamp - lastTime, 50); // Cap to 50ms to prevent spiral
    lastTime = timestamp;

    if (currentScreen !== "play") return;
    if (HUD.isModalOpen()) return;
    if (paused) {
      // Still render so fade shows
      Renderer.draw(charData);
      Input.endFrame();
      return;
    }

    update(dt);
    render();
    Input.endFrame();
  }

  function update(dt) {
    // Dialogue consumes input when active
    if (Dialogue.isActive()) {
      Dialogue.update(dt);
      Camera.update();
      return;
    }

    // Player input & movement
    Player.update(dt);

    // Entities (NPC wander, enemy chase, particle life)
    const pp = Player.getPos();
    Entities.update(dt, pp);

    // Camera follows player
    Camera.follow(pp.x, pp.y);
    Camera.update();

    // Attack — Spacebar
    if (Input.wasPressed(" ")) {
      Combat2D.playerAttack(Player, charData);
    }

    // Skills — 1, 2, 3, 4
    for (let i = 0; i < 4; i++) {
      if (Input.wasPressed(String(i + 1))) {
        Combat2D.useSkill(charData, i);
      }
    }

    // Interact — E key
    if (Input.wasPressed("e") || Input.wasPressed("E")) {
      handleInteraction();
    }

    // Tick skill cooldowns every ~1 second
    if (!Game._cdTimer) Game._cdTimer = 0;
    Game._cdTimer += dt;
    if (Game._cdTimer >= 1000) {
      Combat2D.tickCooldowns(charData);
      Game._cdTimer = 0;
    }

    // Enemy attacks
    Combat2D.updateEnemyAttacks(dt, charData);

    // Check transitions
    const transition = TileMap.findTransition(pp.x, pp.y);
    if (transition) {
      transitionTo(transition.target, transition.spawnId);
    }

    // Auto-save every 60s
    if (!Game._lastAutoSave) Game._lastAutoSave = Date.now();
    if (Date.now() - Game._lastAutoSave > 60000) {
      Save.autoSave(getState());
      Game._lastAutoSave = Date.now();
    }

    // HUD updates
    HUD.update(charData);
    HUD.updateCombatHUD(charData);
  }

  function render() {
    Renderer.draw(charData);
    HUD.drawMinimap(null, charData);
  }

  /* ─── Interaction ─── */
  function handleInteraction() {
    const target = Player.getNearbyInteractable();
    if (!target) return;

    if (target.kind === "npc") {
      Sound.select();
      const dialogueId = target.dialogue || target.dialogueId || target.id || target.name.toLowerCase().replace(/\s/g, "_");
      Dialogue.showAIDialogue(target.name, dialogueId, charData, (result) => {
        if (result && result.loot) {
          result.loot.forEach(item => {
            charData.inventory.push(item);
            HUD.toast(`📦 Received: ${item}`, "#66ff66");
          });
        }
        if (result && result.quest) {
          if (!charData.quests.includes(result.quest)) {
            charData.quests.push(result.quest);
            HUD.toast(`📜 New Quest: ${result.quest}`, "#ffd700");
          }
        }
        if (result && result.xp) {
          Character.addXp(charData, result.xp);
          HUD.toast(`✨ +${result.xp} XP`, "#aaddff");
          checkLevelUp();
        }
        if (result && result.gold) {
          charData.gold += result.gold;
          HUD.toast(`💰 +${result.gold} gold`, "#ffd700");
        }
      });
    }

    if (target.kind === "item") {
      Sound.select();
      charData.inventory.push(target.name);
      Entities.remove(target.id);
      HUD.toast(`Picked up: ${target.name}`, "#66ff66");
    }
  }

  function checkLevelUp() {
    if (charData.xp >= charData.xpToLevel) {
      Character.addXp(charData, 0); // triggers the internal level-up
      const choices = LevelUp.getChoices(charData.class, charData.skills);
      HUD.showModal("⬆️ Level Up!", (body) => {
        body.innerHTML = `<p style="text-align:center;color:#ffd700;margin-bottom:12px;">You reached level ${charData.level}! Choose a reward:</p>`;
        for (const choice of choices) {
          const card = document.createElement("div");
          card.className = "inv-row";
          card.style.cursor = "pointer";
          if (choice.type === "skill") {
            const s = choice.data;
            card.innerHTML = `<span class="inv-name">✨ ${s.name} — ${s.desc} (${s.manaCost}MP, CD:${s.cooldown})</span>`;
          } else {
            const d = choice.data;
            card.innerHTML = `<span class="inv-name">${d.icon} ${d.name} — ${d.desc}</span>`;
          }
          card.onclick = () => {
            const msg = LevelUp.applyChoice(charData, choice);
            HUD.closeModal();
            HUD.toast(msg, "#ffd700");
            Sound.fanfare();
          };
          body.appendChild(card);
        }
      });
    }
  }

  /* ─── Settings ─── */
  function toggleSettings() {
    HUD.showModal("⚙️ Settings", (body) => {
      body.innerHTML = `
        <div class="settings-list">
          <label><input type="checkbox" id="set-sound" checked> 🔊 Sound Effects</label>
          <label><input type="checkbox" id="set-music" checked> 🎵 Ambient Music</label>
          <div class="settings-divider"></div>
          <button class="btn-sm" id="set-abandon">☠️ Abandon Character (Restart)</button>
        </div>
      `;
      document.getElementById("set-sound").onchange = (e) => {
        Sound.setEnabled(e.target.checked);
      };
      document.getElementById("set-music").onchange = (e) => {
        if (e.target.checked) Sound.playAmbient(World.getCurrentType());
        else Sound.stopAmbient();
      };
      document.getElementById("set-abandon").onclick = () => {
        if (confirm("Are you sure? This will start a new game.")) {
          HUD.closeModal();
          charData = null;
          running = false;
          switchScreen("title");
        }
      };
    });
  }

  /* ─── Utilities ─── */
  function randomName() {
    const firsts = ["Aldric", "Theron", "Lyra", "Kael", "Mira", "Dorin", "Isolde", "Brom",
      "Seraphina", "Vex", "Nyx", "Fenwick", "Rowan", "Elara", "Grim", "Zara"];
    const lasts = ["Ironfoot", "Dawnblade", "Shadowmere", "Stormwind", "Ashwood",
      "Brighthollow", "Thornwall", "Nightwhisper", "Fireforge", "Winterborn"];
    return firsts[Math.floor(Math.random() * firsts.length)] + " " +
      lasts[Math.floor(Math.random() * lasts.length)];
  }

  function getCharData() { return charData; }

  return {
    init, switchScreen, transitionTo, loadGame,
    getCharData, getState, checkLevelUp,
    _lastAutoSave: 0,
  };
})();

/* ─── Boot ─── */
window.addEventListener("DOMContentLoaded", () => Game.init());
