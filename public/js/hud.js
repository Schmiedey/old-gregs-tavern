/* ═══════════════════════════════════════════
   hud.js — Heads-Up Display overlay
   HP/MP/XP bars, minimap, inventory modal,
   equipment modal, toast notifications
   ═══════════════════════════════════════════ */

const HUD = (() => {
  let toastQueue = [];

  function update(charData) {
    if (!charData) return;

    // Name
    const nameEl = document.getElementById("hud-name");
    if (nameEl) nameEl.textContent = `${charData.name} — Lv${charData.level} ${charData.race} ${charData.class}`;

    // HP bar
    const hpFill = document.getElementById("hp-fill");
    const hpText = document.getElementById("hp-text");
    if (hpFill) hpFill.style.width = ((charData.hp / charData.maxHp) * 100) + "%";
    if (hpText) hpText.textContent = `${charData.hp}/${charData.maxHp}`;

    // MP bar
    const mpFill = document.getElementById("mp-fill");
    const mpText = document.getElementById("mp-text");
    if (mpFill) mpFill.style.width = ((charData.mana / charData.maxMana) * 100) + "%";
    if (mpText) mpText.textContent = `${charData.mana}/${charData.maxMana}`;

    // XP bar
    const xpFill = document.getElementById("xp-fill");
    const xpText = document.getElementById("xp-text");
    if (xpFill) xpFill.style.width = ((charData.xp / charData.xpToLevel) * 100) + "%";
    if (xpText) xpText.textContent = `Lv${charData.level} (${charData.xp}/${charData.xpToLevel})`;

    // Gold
    const goldEl = document.getElementById("hud-gold");
    if (goldEl) goldEl.textContent = `💰 ${charData.gold}`;

    // Location
    const locEl = document.getElementById("hud-location");
    if (locEl) locEl.textContent = `📍 ${World.getCurrentName()}`;

    // Portrait
    const portrait = document.getElementById("hud-portrait");
    if (portrait) {
      portrait.textContent = getPortraitEmoji(charData.race, charData.class);
    }
  }

  function getPortraitEmoji(race, cls) {
    const r = { Human: "🧑", Elf: "🧝", Dwarf: "⛏️", Halfling: "🦶", Orc: "👹", Tiefling: "😈" };
    return r[race] || "🧑";
  }

  function drawMinimap(ctx, charData) {
    const canvas = document.getElementById("minimap");
    if (!canvas) return;
    const mctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    mctx.fillStyle = "#0d0b0e";
    mctx.fillRect(0, 0, w, h);

    const mapW = TileMap.getWidth();
    const mapH = TileMap.getHeight();
    if (!mapW || !mapH) return;

    const scaleX = w / mapW;
    const scaleY = h / mapH;

    // Draw tiles
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const tile = TileMap.getTile(x, y);
        const solid = TileMap.isSolid(x, y);
        if (solid) {
          if (tile === "water") mctx.fillStyle = "#2a4a8a";
          else if (tile === "tree" || tile === "bush") mctx.fillStyle = "#1a3a1a";
          else mctx.fillStyle = "#333";
        } else {
          if (tile.includes("tavern") || tile === "wood") mctx.fillStyle = "#4a3020";
          else if (tile === "path" || tile === "dirt") mctx.fillStyle = "#6a5a3a";
          else if (tile === "stone") mctx.fillStyle = "#4a4a5a";
          else if (tile === "grass" || tile === "grass2") mctx.fillStyle = "#2a4a1a";
          else if (tile === "carpet") mctx.fillStyle = "#4a1a1a";
          else mctx.fillStyle = "#2a2a2a";
        }
        mctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    // Draw entities
    const entities = Entities.getAll();
    for (const e of entities) {
      const ex = (e.x / Sprites.TILE) * scaleX;
      const ey = (e.y / Sprites.TILE) * scaleY;
      if (e.kind === "enemy" && e.hp > 0) {
        mctx.fillStyle = "#ff4444";
        mctx.fillRect(ex, ey, 3, 3);
      } else if (e.kind === "npc") {
        mctx.fillStyle = "#ffd700";
        mctx.fillRect(ex, ey, 3, 3);
      } else if (e.kind === "item") {
        mctx.fillStyle = "#44ff44";
        mctx.fillRect(ex, ey, 2, 2);
      }
    }

    // Draw player
    const pPos = Player.getTilePos();
    mctx.fillStyle = "#4488ff";
    mctx.fillRect(pPos.x * scaleX - 1, pPos.y * scaleY - 1, 5, 5);

    // Border
    mctx.strokeStyle = "#3a2f47";
    mctx.lineWidth = 2;
    mctx.strokeRect(0, 0, w, h);
  }

  /* ─── Toast notifications ─── */
  function toast(message, color) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = "toast";
    el.style.color = color || "#d4d0c8";
    el.textContent = message;
    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add("show"));

    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 500);
    }, 3000);
  }

  /* ─── Modal system ─── */
  function showModal(title, renderFn) {
    const overlay = document.getElementById("modal-overlay");
    const titleEl = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    if (!overlay) return;

    overlay.classList.remove("hidden");
    if (titleEl) titleEl.textContent = title;
    if (body) { body.innerHTML = ""; renderFn(body); }
    Combat2D.setPaused(true);
  }

  function closeModal() {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) overlay.classList.add("hidden");
    Combat2D.setPaused(false);
  }

  function isModalOpen() {
    const overlay = document.getElementById("modal-overlay");
    return overlay && !overlay.classList.contains("hidden");
  }

  /* ─── Inventory modal ─── */
  function showInventory(charData) {
    showModal("🎒 Inventory", (body) => {
      if (charData.inventory.length === 0) {
        body.innerHTML = '<div class="modal-empty">Inventory is empty</div>';
        return;
      }
      const list = document.createElement("div");
      list.className = "inv-list";
      charData.inventory.forEach((item, i) => {
        const row = document.createElement("div");
        row.className = "inv-row";
        const equippable = Equipment.isEquippable(item);
        row.innerHTML = `<span class="inv-name">${item}</span>`;

        const btns = document.createElement("div");
        btns.className = "inv-btns";

        if (equippable) {
          const btn = document.createElement("button");
          btn.className = "btn-sm";
          btn.textContent = "Equip";
          btn.onclick = () => {
            Equipment.equip(charData, item);
            showInventory(charData);
          };
          btns.appendChild(btn);
        }
        if (item.includes("Potion")) {
          const btn = document.createElement("button");
          btn.className = "btn-sm";
          btn.textContent = "Use";
          btn.onclick = () => {
            usePotion(charData, i);
            showInventory(charData);
          };
          btns.appendChild(btn);
        }
        row.appendChild(btns);
        list.appendChild(row);
      });
      body.appendChild(list);
    });
  }

  function usePotion(charData, index) {
    const item = charData.inventory[index];
    if (!item) return;
    if (item === "Health Potion" || item === "Greater Health Potion") {
      const amt = item.includes("Greater") ? Dice.roll(8, 2).total + 4 : Dice.roll(8).rolls[0] + 2;
      Character.heal(charData, amt);
      charData.inventory.splice(index, 1);
      Sound.heal();
      toast(`🧪 ${item}: +${amt} HP!`);
    } else if (item === "Mana Potion") {
      Character.restoreMana(charData, 10);
      charData.inventory.splice(index, 1);
      Sound.heal();
      toast(`🔮 Mana Potion: +10 MP!`);
    }
  }

  /* ─── Equipment modal ─── */
  function showEquipment(charData) {
    showModal("⚔️ Equipment", (body) => {
      Equipment.render(body, charData,
        (name) => { Equipment.equip(charData, name); showEquipment(charData); },
        (slot) => { Equipment.unequip(charData, slot); showEquipment(charData); }
      );
    });
  }

  /* ─── Map modal ─── */
  function showMap() {
    showModal("🗺️ World Map", (body) => {
      const visited = World.getVisited();
      const all = World.getAllMapNames();
      const list = document.createElement("div");
      list.className = "map-list";
      for (const m of all) {
        const found = visited.includes(m.id);
        const div = document.createElement("div");
        div.className = "map-entry" + (found ? " visited" : " unknown");
        div.innerHTML = found
          ? `<span class="map-icon">${getTypeIcon(m.type)}</span><span class="map-name">${m.name}</span>`
          : `<span class="map-icon">❓</span><span class="map-name">???</span>`;
        if (m.id === World.getCurrentId()) div.classList.add("current");
        list.appendChild(div);
      }
      body.appendChild(list);
    });
  }

  function getTypeIcon(type) {
    const icons = {
      tavern: "🍺", wilderness: "🌲", cave: "🕳️", dungeon: "💀",
      town: "🏘️", castle: "🏰", road: "🛤️", mountain: "⛰️",
    };
    return icons[type] || "❓";
  }

  /* ─── Journal modal ─── */
  function showJournal() {
    showModal("📖 Lore Journal", (body) => {
      Journal.render(body);
    });
  }

  /* ─── Quests modal ─── */
  function showQuests(charData) {
    showModal("📜 Quests", (body) => {
      const quests = charData.quests || [];
      if (quests.length === 0) {
        body.innerHTML = '<div class="modal-empty">No active quests</div>';
        return;
      }
      const list = document.createElement("div");
      list.className = "quest-list";
      quests.forEach(q => {
        const div = document.createElement("div");
        div.className = "quest-item";
        div.textContent = `📜 ${q}`;
        list.appendChild(div);
      });
      body.appendChild(list);
    });
  }

  /* ─── Save modal ─── */
  function showSave(charData, getStateFn) {
    showModal("💾 Save / Load", (body) => {
      const slots = Save.listSlots();
      slots.forEach(slot => {
        const div = document.createElement("div");
        div.className = "save-slot";
        if (slot.empty) {
          div.innerHTML = `<div class="save-empty">Slot ${slot.slot + 1} — Empty</div>`;
          div.onclick = () => {
            if (charData) {
              Save.save(slot.slot, getStateFn());
              toast("💾 Game saved!");
              showSave(charData, getStateFn);
            }
          };
        } else {
          div.innerHTML = `
            <div class="save-info"><strong>${slot.name}</strong> — Lv${slot.level} ${slot.race} ${slot.class}</div>
            <div class="save-date">${slot.date}</div>
            <div class="save-btns">
              <button class="btn-sm save-load" data-slot="${slot.slot}">Load</button>
              <button class="btn-sm save-over" data-slot="${slot.slot}">Save</button>
              <button class="btn-sm save-del" data-slot="${slot.slot}">🗑️</button>
            </div>
          `;
        }
        body.appendChild(div);
      });

      body.querySelectorAll(".save-load").forEach(btn => {
        btn.onclick = () => { closeModal(); Game.loadGame(parseInt(btn.dataset.slot)); };
      });
      body.querySelectorAll(".save-over").forEach(btn => {
        btn.onclick = () => { Save.save(parseInt(btn.dataset.slot), getStateFn()); toast("💾 Saved!"); showSave(charData, getStateFn); };
      });
      body.querySelectorAll(".save-del").forEach(btn => {
        btn.onclick = () => { Save.remove(parseInt(btn.dataset.slot)); showSave(charData, getStateFn); };
      });
    });
  }

  /* ─── Combat HUD (skills bar) ─── */
  function updateCombatHUD(charData) {
    const hud = document.getElementById("combat-hud");
    if (!hud) return;

    const enemies = Entities.getEnemies();
    if (enemies.length > 0) {
      hud.classList.remove("hidden");
    } else {
      hud.classList.add("hidden");
      return;
    }

    // Enemy info
    const enemyInfo = document.getElementById("combat-enemy-info");
    if (enemyInfo) {
      enemyInfo.innerHTML = enemies.slice(0, 3).map(e =>
        `<span class="enemy-tag">${e.name} ${e.hp}/${e.maxHp}</span>`
      ).join(" ");
    }

    // Actions
    const actions = document.getElementById("combat-actions");
    if (actions) {
      actions.innerHTML = "";
      charData.skills.forEach((s, i) => {
        const btn = document.createElement("button");
        btn.className = "combat-skill-btn" + (s.currentCooldown > 0 ? " on-cd" : "");
        btn.textContent = `${i + 1}: ${s.name} (${s.manaCost}MP)`;
        btn.title = s.desc;
        if (s.currentCooldown > 0) btn.textContent += ` [${s.currentCooldown}t]`;
        btn.onclick = () => Combat2D.useSkill(charData, i);
        actions.appendChild(btn);
      });
    }

    // Log
    const log = document.getElementById("combat-log");
    if (log) {
      log.innerHTML = Combat2D.getLog().map(l => `<div class="combat-log-line">${l}</div>`).join("");
    }
  }

  return {
    update, drawMinimap, toast, showModal, closeModal, isModalOpen,
    showInventory, showEquipment, showMap, showJournal, showQuests, showSave,
    updateCombatHUD,
  };
})();
