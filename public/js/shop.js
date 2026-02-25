/* ═══════════════════════════════════════════
   shop.js — Merchant system with buy/sell
   ═══════════════════════════════════════════ */

const Shop = (() => {
  const CATALOG = {
    weapons: [
      { name: "Iron Longsword", price: 25, type: "weapon", bonus: 1, desc: "+1 ATK" },
      { name: "Steel Greatsword", price: 60, type: "weapon", bonus: 2, desc: "+2 ATK" },
      { name: "Enchanted Blade", price: 120, type: "weapon", bonus: 3, desc: "+3 ATK, glows faintly" },
      { name: "Longbow", price: 30, type: "weapon", bonus: 1, desc: "+1 ATK (ranged)" },
      { name: "War Hammer", price: 40, type: "weapon", bonus: 2, desc: "+2 ATK, heavy" },
    ],
    armor: [
      { name: "Leather Armor", price: 20, type: "armor", bonus: 1, desc: "+1 AC" },
      { name: "Chain Mail", price: 50, type: "armor", bonus: 2, desc: "+2 AC" },
      { name: "Plate Armor", price: 100, type: "armor", bonus: 3, desc: "+3 AC" },
      { name: "Enchanted Cloak", price: 45, type: "armor", bonus: 1, desc: "+1 AC, +1 DEX saves" },
      { name: "Shield", price: 15, type: "armor", bonus: 1, desc: "+1 AC" },
    ],
    potions: [
      { name: "Health Potion", price: 10, type: "potion", effect: "heal", value: 10, desc: "Restore ~10 HP" },
      { name: "Greater Health Potion", price: 25, type: "potion", effect: "heal", value: 20, desc: "Restore ~20 HP" },
      { name: "Mana Potion", price: 12, type: "potion", effect: "mana", value: 10, desc: "Restore 10 Mana" },
      { name: "Antidote", price: 8, type: "potion", effect: "cure", value: "Poisoned", desc: "Cure poison" },
      { name: "Elixir of Strength", price: 30, type: "potion", effect: "buff", value: "STR+2", desc: "+2 STR for 5 turns" },
    ],
    misc: [
      { name: "Torch", price: 2, type: "misc", desc: "Lights the way" },
      { name: "Rope (50ft)", price: 5, type: "misc", desc: "Useful for climbing" },
      { name: "Lockpicks", price: 15, type: "misc", desc: "For locked doors & chests" },
      { name: "Camping Kit", price: 12, type: "misc", desc: "Rest anywhere to recover HP" },
      { name: "Scroll of Identify", price: 20, type: "misc", desc: "Identify a magical item" },
    ],
  };

  let currentStock = [];

  /**
   * Generate randomized stock for a shop visit
   */
  function generateStock() {
    currentStock = [];
    for (const [category, items] of Object.entries(CATALOG)) {
      // Pick 2-3 random items from each category
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        // Random price variance ±15%
        const variance = 0.85 + Math.random() * 0.3;
        currentStock.push({
          ...shuffled[i],
          category,
          currentPrice: Math.round(shuffled[i].price * variance),
        });
      }
    }
    return currentStock;
  }

  function getStock() { return currentStock; }

  /**
   * Buy an item — returns { success, message }
   */
  function buy(player, itemIndex) {
    const item = currentStock[itemIndex];
    if (!item) return { success: false, message: "Item not found." };
    if (player.gold < item.currentPrice) {
      return { success: false, message: `Not enough gold! Need ${item.currentPrice}, have ${player.gold}.` };
    }
    player.gold -= item.currentPrice;
    player.inventory.push(item.name);

    // Apply passive bonuses
    if (item.type === "armor" && item.bonus) {
      player.ac += item.bonus;
    }

    return { success: true, message: `Bought **${item.name}** for ${item.currentPrice} gold.` };
  }

  /**
   * Sell an item from inventory — half price
   */
  function sell(player, inventoryIndex) {
    const itemName = player.inventory[inventoryIndex];
    if (!itemName) return { success: false, message: "No item to sell." };

    // Find base price
    let basePrice = 5;
    for (const items of Object.values(CATALOG)) {
      const found = items.find((i) => i.name === itemName);
      if (found) { basePrice = found.price; break; }
    }
    const sellPrice = Math.max(1, Math.floor(basePrice / 2));

    player.inventory.splice(inventoryIndex, 1);
    player.gold += sellPrice;

    // Remove passive bonuses if armor
    const catalogItem = Object.values(CATALOG).flat().find((i) => i.name === itemName);
    if (catalogItem?.type === "armor" && catalogItem.bonus) {
      player.ac = Math.max(10, player.ac - catalogItem.bonus);
    }

    return { success: true, message: `Sold **${itemName}** for ${sellPrice} gold.` };
  }

  /**
   * Render shop UI into container
   */
  function render(container, player, onBuy, onSell) {
    container.innerHTML = "";

    // Gold display
    const goldDiv = document.createElement("div");
    goldDiv.className = "shop-gold";
    goldDiv.innerHTML = `💰 Your Gold: <strong>${player.gold}</strong>`;
    container.appendChild(goldDiv);

    // Buy section
    const buyHeader = document.createElement("h3");
    buyHeader.textContent = "🛒 Buy";
    buyHeader.className = "shop-section-header";
    container.appendChild(buyHeader);

    const buyGrid = document.createElement("div");
    buyGrid.className = "shop-grid";
    currentStock.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "shop-item" + (player.gold < item.currentPrice ? " too-expensive" : "");
      card.innerHTML = `
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-price">💰 ${item.currentPrice}</div>
      `;
      card.addEventListener("click", () => { if (player.gold >= item.currentPrice) onBuy(idx); });
      buyGrid.appendChild(card);
    });
    container.appendChild(buyGrid);

    // Sell section
    const sellHeader = document.createElement("h3");
    sellHeader.textContent = "💸 Sell (half price)";
    sellHeader.className = "shop-section-header";
    container.appendChild(sellHeader);

    const sellGrid = document.createElement("div");
    sellGrid.className = "shop-grid";
    if (player.inventory.length === 0) {
      sellGrid.innerHTML = '<div class="shop-empty">No items to sell</div>';
    } else {
      player.inventory.forEach((name, idx) => {
        let basePrice = 5;
        for (const items of Object.values(CATALOG)) {
          const f = items.find((i) => i.name === name);
          if (f) { basePrice = f.price; break; }
        }
        const card = document.createElement("div");
        card.className = "shop-item sellable";
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
