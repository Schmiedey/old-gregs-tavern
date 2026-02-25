/* ═══════════════════════════════════════════
   equipment.js — Equipment slots system
   Weapon, Armor, Helmet, Ring, Amulet
   ═══════════════════════════════════════════ */

const Equipment = (() => {
  const SLOTS = ["weapon", "armor", "helmet", "ring", "amulet"];

  const SLOT_ICONS = {
    weapon: "⚔️", armor: "🛡️", helmet: "⛑️", ring: "💍", amulet: "📿",
  };

  const ITEM_DB = {
    // Weapons
    "Iron Longsword":   { slot: "weapon", atk: 1, def: 0, hp: 0, mana: 0, desc: "+1 ATK", rarity: "common" },
    "Steel Greatsword":  { slot: "weapon", atk: 2, def: 0, hp: 0, mana: 0, desc: "+2 ATK", rarity: "uncommon" },
    "Enchanted Blade":   { slot: "weapon", atk: 3, def: 0, hp: 0, mana: 0, desc: "+3 ATK, glows", rarity: "rare" },
    "Longbow":           { slot: "weapon", atk: 1, def: 0, hp: 0, mana: 0, desc: "+1 ATK ranged", rarity: "common" },
    "War Hammer":        { slot: "weapon", atk: 2, def: 0, hp: 0, mana: 0, desc: "+2 ATK heavy", rarity: "uncommon" },
    "Twin Daggers":      { slot: "weapon", atk: 1, def: 0, hp: 0, mana: 0, desc: "+1 ATK fast", rarity: "common" },
    "Gnarled Staff":     { slot: "weapon", atk: 0, def: 0, hp: 0, mana: 3, desc: "+3 Mana", rarity: "common" },
    "Holy Mace":         { slot: "weapon", atk: 1, def: 0, hp: 0, mana: 1, desc: "+1 ATK +1 MP", rarity: "common" },
    "Lute & Rapier":     { slot: "weapon", atk: 1, def: 0, hp: 0, mana: 2, desc: "+1 ATK +2 MP", rarity: "common" },
    "Rusty Sword":       { slot: "weapon", atk: 0, def: 0, hp: 0, mana: 0, desc: "It's rusty", rarity: "common" },
    "Flamebrand":        { slot: "weapon", atk: 4, def: 0, hp: 0, mana: 0, desc: "+4 ATK fire", rarity: "epic" },
    "Shadowfang":        { slot: "weapon", atk: 3, def: 0, hp: 5, mana: 0, desc: "+3 ATK +5 HP", rarity: "epic" },
    // Armor
    "Leather Armor":     { slot: "armor", atk: 0, def: 1, hp: 0, mana: 0, desc: "+1 AC", rarity: "common" },
    "Chain Mail":        { slot: "armor", atk: 0, def: 2, hp: 0, mana: 0, desc: "+2 AC", rarity: "uncommon" },
    "Plate Armor":       { slot: "armor", atk: 0, def: 3, hp: 0, mana: 0, desc: "+3 AC", rarity: "rare" },
    "Enchanted Cloak":   { slot: "armor", atk: 0, def: 1, hp: 0, mana: 2, desc: "+1 AC +2 MP", rarity: "uncommon" },
    "Dragonscale Mail":  { slot: "armor", atk: 0, def: 4, hp: 10, mana: 0, desc: "+4 AC +10 HP", rarity: "epic" },
    // Helmets
    "Iron Helm":         { slot: "helmet", atk: 0, def: 1, hp: 0, mana: 0, desc: "+1 AC", rarity: "common" },
    "Crown of Wisdom":   { slot: "helmet", atk: 0, def: 0, hp: 0, mana: 5, desc: "+5 Mana", rarity: "rare" },
    "Horned Helm":       { slot: "helmet", atk: 1, def: 1, hp: 0, mana: 0, desc: "+1 ATK +1 AC", rarity: "uncommon" },
    // Rings
    "Ring of Strength":  { slot: "ring", atk: 2, def: 0, hp: 0, mana: 0, desc: "+2 ATK", rarity: "uncommon" },
    "Ring of Protection":{ slot: "ring", atk: 0, def: 2, hp: 0, mana: 0, desc: "+2 AC", rarity: "uncommon" },
    "Ring of Vitality":  { slot: "ring", atk: 0, def: 0, hp: 10, mana: 0, desc: "+10 HP", rarity: "rare" },
    "Ring of Arcana":    { slot: "ring", atk: 0, def: 0, hp: 0, mana: 8, desc: "+8 Mana", rarity: "rare" },
    // Amulets
    "Amulet of Health":  { slot: "amulet", atk: 0, def: 0, hp: 15, mana: 0, desc: "+15 HP", rarity: "rare" },
    "Amulet of Power":   { slot: "amulet", atk: 2, def: 0, hp: 0, mana: 5, desc: "+2 ATK +5 MP", rarity: "rare" },
    "Amulet of Warding": { slot: "amulet", atk: 0, def: 2, hp: 5, mana: 0, desc: "+2 AC +5 HP", rarity: "rare" },
    "Cursed Pendant":    { slot: "amulet", atk: 5, def: -1, hp: -10, mana: 0, desc: "+5 ATK -1 AC -10 HP", rarity: "epic" },
  };

  const RARITY_COLORS = {
    common: "#aaa", uncommon: "#5a5", rare: "#58c", epic: "#a6d", legendary: "#ffd700",
  };

  function createSlots() {
    return { weapon: null, armor: null, helmet: null, ring: null, amulet: null };
  }

  function getItemData(name) {
    return ITEM_DB[name] || null;
  }

  function isEquippable(name) {
    return !!ITEM_DB[name];
  }

  function equip(player, itemName) {
    const data = ITEM_DB[itemName];
    if (!data) return { success: false, msg: `${itemName} can't be equipped.` };

    const slot = data.slot;
    const current = player.equipment[slot];

    // Unequip current item first
    if (current) {
      unequip(player, slot);
    }

    // Remove from inventory
    const idx = player.inventory.indexOf(itemName);
    if (idx === -1) return { success: false, msg: `You don't have ${itemName}.` };
    player.inventory.splice(idx, 1);

    // Equip
    player.equipment[slot] = itemName;

    // Apply stats
    applyStats(player, data, 1);

    return { success: true, msg: `Equipped **${itemName}** → ${SLOT_ICONS[slot]}` };
  }

  function unequip(player, slot) {
    const itemName = player.equipment[slot];
    if (!itemName) return { success: false, msg: "Nothing equipped there." };

    const data = ITEM_DB[itemName];
    player.equipment[slot] = null;
    player.inventory.push(itemName);

    // Remove stats
    if (data) applyStats(player, data, -1);

    return { success: true, msg: `Unequipped **${itemName}**` };
  }

  function applyStats(player, data, multiplier) {
    if (data.def) player.ac += data.def * multiplier;
    if (data.hp) {
      player.maxHp += data.hp * multiplier;
      player.hp = Math.min(player.hp, player.maxHp);
      if (player.hp < 1) player.hp = 1;
    }
    if (data.mana) {
      player.maxMana += data.mana * multiplier;
      player.mana = Math.min(player.mana, player.maxMana);
    }
  }

  function getAtkBonus(player) {
    let bonus = 0;
    for (const slot of SLOTS) {
      const item = player.equipment[slot];
      if (item && ITEM_DB[item]) bonus += ITEM_DB[item].atk;
    }
    return bonus;
  }

  function getTotalStats(player) {
    const totals = { atk: 0, def: 0, hp: 0, mana: 0 };
    for (const slot of SLOTS) {
      const item = player.equipment[slot];
      if (item && ITEM_DB[item]) {
        const d = ITEM_DB[item];
        totals.atk += d.atk;
        totals.def += d.def;
        totals.hp += d.hp;
        totals.mana += d.mana;
      }
    }
    return totals;
  }

  function render(container, player, onEquip, onUnequip) {
    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "equip-grid";

    for (const slot of SLOTS) {
      const div = document.createElement("div");
      div.className = "equip-slot";
      const item = player.equipment[slot];
      const data = item ? ITEM_DB[item] : null;
      const rarityColor = data ? (RARITY_COLORS[data.rarity] || "#aaa") : "var(--border)";

      div.innerHTML = `
        <div class="equip-slot-icon" style="border-color:${rarityColor}">${item ? SLOT_ICONS[slot] : "∅"}</div>
        <div class="equip-slot-name" style="color:${rarityColor}">${item || slot}</div>
      `;

      if (item) {
        div.addEventListener("click", () => onUnequip(slot));
        div.title = `${item}: ${data?.desc || ""} (click to unequip)`;
      }
      grid.appendChild(div);
    }

    container.appendChild(grid);

    // Show equippable items from inventory
    const equippable = player.inventory.filter((i) => ITEM_DB[i]);
    if (equippable.length > 0) {
      const h = document.createElement("div");
      h.className = "equip-available-header";
      h.textContent = "Equippable Items:";
      container.appendChild(h);

      const list = document.createElement("div");
      list.className = "equip-available";
      equippable.forEach((name) => {
        const d = ITEM_DB[name];
        const btn = document.createElement("button");
        btn.className = "btn btn-sm equip-item-btn";
        btn.style.borderColor = RARITY_COLORS[d.rarity] || "#aaa";
        btn.textContent = `${SLOT_ICONS[d.slot]} ${name}`;
        btn.title = d.desc;
        btn.onclick = () => onEquip(name);
        list.appendChild(btn);
      });
      container.appendChild(list);
    }
  }

  return { createSlots, getItemData, isEquippable, equip, unequip, getAtkBonus, getTotalStats, render, SLOTS, SLOT_ICONS, ITEM_DB, RARITY_COLORS };
})();
