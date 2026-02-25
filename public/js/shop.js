/* ═══════════════════════════════════════════
   shop.js — Merchant system with buy/sell
   Integrated with equipment system
   ═══════════════════════════════════════════ */

const Shop = (() => {
  const CATALOG = {
    weapons: [
      { name: "Iron Longsword", price: 25, type: "weapon", bonus: 1, desc: "+1 ATK" },
      { name: "Steel Greatsword", price: 60, type: "weapon", bonus: 2, desc: "+2 ATK" },
      { name: "Enchanted Blade", price: 120, type: "weapon", bonus: 3, desc: "+3 ATK, glows" },
      { name: "Longbow", price: 30, type: "weapon", bonus: 1, desc: "+1 ATK ranged" },
      { name: "War Hammer", price: 40, type: "weapon", bonus: 2, desc: "+2 ATK heavy" },
      { name: "Flamebrand", price: 250, type: "weapon", bonus: 4, desc: "+4 ATK fire" },
      { name: "Shadowfang", price: 200, type: "weapon", bonus: 3, desc: "+3 ATK +5 HP" },
    ],
    armor: [
      { name: "Leather Armor", price: 20, type: "armor", bonus: 1, desc: "+1 AC" },
      { name: "Chain Mail", price: 50, type: "armor", bonus: 2, desc: "+2 AC" },
      { name: "Plate Armor", price: 100, type: "armor", bonus: 3, desc: "+3 AC" },
      { name: "Enchanted Cloak", price: 45, type: "armor", bonus: 1, desc: "+1 AC +2 MP" },
      { name: "Iron Helm", price: 30, type: "armor", bonus: 1, desc: "+1 AC (head)" },
      { name: "Horned Helm", price: 55, type: "armor", bonus: 1, desc: "+1 ATK +1 AC" },
    ],
    jewelry: [
      { name: "Ring of Strength", price: 80, type: "ring", bonus: 2, desc: "+2 ATK" },
      { name: "Ring of Protection", price: 80, type: "ring", bonus: 2, desc: "+2 AC" },
      { name: "Ring of Vitality", price: 120, type: "ring", bonus: 0, desc: "+10 HP" },
      { name: "Amulet of Health", price: 150, type: "amulet", bonus: 0, desc: "+15 HP" },
      { name: "Amulet of Power", price: 180, type: "amulet", bonus: 2, desc: "+2 ATK +5 MP" },
    ],
    potions: [
      { name: "Health Potion", price: 10, type: "potion", effect: "heal", value: 10, desc: "Restore ~10 HP" },
      { name: "Greater Health Potion", price: 25, type: "potion", effect: "heal", value: 20, desc: "Restore ~20 HP" },
      { name: "Mana Potion", price: 12, type: "potion", effect: "mana", value: 10, desc: "Restore 10 Mana" },
      { name: "Antidote", price: 8, type: "potion", effect: "cure", value: "Poisoned", desc: "Cure poison" },
      { name: "Elixir of Strength", price: 30, type: "potion", effect: "buff", value: "STR+2", desc: "+2 STR 5 turns" },
    ],
    misc: [
      { name: "Torch", price: 2, type: "misc", desc: "Lights the way" },
      { name: "Rope (50ft)", price: 5, type: "misc", desc: "For climbing" },
      { name: "Lockpicks", price: 15, type: "misc", desc: "For locked doors" },
      { name: "Camping Kit", price: 12, type: "misc", desc: "Rest to recover HP" },
      { name: "Scroll of Identify", price: 20, type: "misc", desc: "Identify magic items" },
    ],
  };

  let currentStock = [];

  function generateStock() {
    currentStock = [];
    for (const [category, items] of Object.entries(CATALOG)) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const variance = 0.85 + Math.random() * 0.3;
        currentStock.push({ ...shuffled[i], category, currentPrice: Math.round(shuffled[i].price * variance) });
      }
    }
    return currentStock;
  }

  function getStock() { return currentStock; }

  function buy(player, itemIndex) {
    const item = currentStock[itemIndex];
    if (!item) return { success: false, message: "Item not found." };
    if (player.gold < item.currentPrice) return { success: false, message: `Not enough gold! Need ${item.currentPrice}g, have ${player.gold}g.` };
    player.gold -= item.currentPrice;
    player.inventory.push(item.name);
    return { success: true, message: `Bought **${item.name}** for ${item.currentPrice}g.` };
  }

  function sell(player, inventoryIndex) {
    const itemName = player.inventory[inventoryIndex];
    if (!itemName) return { success: false, message: "No item to sell." };
    let basePrice = 5;
    for (const items of Object.values(CATALOG)) {
      const found = items.find((i) => i.name === itemName);
      if (found) { basePrice = found.price; break; }
    }
    const sellPrice = Math.max(1, Math.floor(basePrice / 2));
    player.inventory.splice(inventoryIndex, 1);
    player.gold += sellPrice;
    return { success: true, message: `Sold **${itemName}** for ${sellPrice}g.` };
  }

  function render(container, player, onBuy, onSell) {
    container.innerHTML = "";
    const goldDiv = document.createElement("div");
    goldDiv.className = "shop-gold";
    goldDiv.innerHTML = `💰 Your Gold: <strong>${player.gold}</strong>`;
    container.appendChild(goldDiv);

    const buyHeader = document.createElement("h3");
    buyHeader.textContent = "🛒 Buy";
    buyHeader.className = "shop-section-header";
    container.appendChild(buyHeader);

    const buyGrid = document.createElement("div");
    buyGrid.className = "shop-grid";
    currentStock.forEach((item, idx) => {
      const equippable = Equipment.isEquippable(item.name);
      const card = document.createElement("div");
      card.className = "shop-item" + (player.gold < item.currentPrice ? " too-expensive" : "");
      const rarityData = Equipment.getItemData(item.name);
      const rarityColor = rarityData ? (Equipment.RARITY_COLORS[rarityData.rarity] || "#aaa") : "#aaa";
      card.innerHTML = `
        <div class="shop-item-name" ${equippable ? `style="color:${rarityColor}"` : ""}>${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-price">💰 ${item.currentPrice}</div>
      `;
      card.addEventListener("click", () => { if (player.gold >= item.currentPrice) onBuy(idx); });
      buyGrid.appendChild(card);
    });
    container.appendChild(buyGrid);

    const sellHeader = document.createElement("h3");
    sellHeader.textContent = "💸 Sell (half price)";
    sellHeader.className = "shop-section-header";
    container.appendChild(sellHeader);

    const sellGrid = document.createElement("div");
    sellGrid.className = "shop-grid";
    if (player.inventory.length === 0) {
      sellGrid.innerHTML = '<div class="shop-empty">Nothing to sell</div>';
    } else {
      player.inventory.forEach((name, idx) => {
        const card = document.createElement("div");
        card.className = "shop-item sellable";
        let basePrice = 5;
        for (const items of Object.values(CATALOG)) {
          const found = items.find((i) => i.name === name);
          if (found) { basePrice = found.price; break; }
        }
        card.innerHTML = `
          <div class="shop-item-name">${name}</div>
          <div class="shop-item-price">💰 ${Math.max(1, Math.floor(basePrice / 2))}</div>
        `;
        card.addEventListener("click", () => onSell(idx));
        sellGrid.appendChild(card);
      });
    }
    container.appendChild(sellGrid);
  }

  return { generateStock, getStock, buy, sell, render, CATALOG };
})();
