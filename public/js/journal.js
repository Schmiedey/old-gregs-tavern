/* ═══════════════════════════════════════════
   journal.js — Lore journal system
   Collects lore entries from AI narrative
   ═══════════════════════════════════════════ */

const Journal = (() => {
  const CATEGORIES = {
    history: { icon: "📜", color: "#d4a745" },
    people: { icon: "👤", color: "#58c" },
    places: { icon: "🗺️", color: "#5a5" },
    items: { icon: "🔮", color: "#a6d" },
    creatures: { icon: "🐉", color: "#c44" },
    myths: { icon: "✨", color: "#ffd700" },
    other: { icon: "📝", color: "#888" },
  };

  let entries = [];

  function init() { entries = []; }

  function add(title, category, text) {
    if (!title || !text) return false;
    const cat = CATEGORIES[category] ? category : "other";
    if (entries.some((e) => e.title === title)) return false;
    entries.push({
      title,
      category: cat,
      text,
      discovered: Date.now(),
      read: false,
    });
    return true;
  }

  function markRead(index) {
    if (entries[index]) entries[index].read = true;
  }

  function getUnreadCount() {
    return entries.filter((e) => !e.read).length;
  }

  function getAll() { return entries; }
  function count() { return entries.length; }

  function parseLoreBlock(data) {
    if (!data.title || !data.text) return false;
    return add(data.title, data.category || "other", data.text);
  }

  function render(container) {
    container.innerHTML = "";

    if (entries.length === 0) {
      container.innerHTML = '<div class="journal-empty">Your journal is empty. Explore the world to discover lore!</div>';
      return;
    }

    // Category tabs
    const cats = [...new Set(entries.map((e) => e.category))];
    const tabs = document.createElement("div");
    tabs.className = "journal-tabs";

    const allTab = document.createElement("button");
    allTab.className = "btn btn-sm journal-tab active";
    allTab.textContent = `All (${entries.length})`;
    allTab.onclick = () => showCategory("all", container, tabs);
    tabs.appendChild(allTab);

    for (const cat of cats) {
      const tab = document.createElement("button");
      tab.className = "btn btn-sm journal-tab";
      const catInfo = CATEGORIES[cat] || CATEGORIES.other;
      const count = entries.filter((e) => e.category === cat).length;
      tab.textContent = `${catInfo.icon} ${cat} (${count})`;
      tab.onclick = () => showCategory(cat, container, tabs);
      tabs.appendChild(tab);
    }

    container.appendChild(tabs);

    const listEl = document.createElement("div");
    listEl.className = "journal-entries";
    listEl.id = "journal-entries";
    container.appendChild(listEl);

    showCategory("all", container, tabs);
  }

  function showCategory(cat, container, tabs) {
    tabs.querySelectorAll(".journal-tab").forEach((t) => t.classList.remove("active"));
    const idx = cat === "all" ? 0 : [...tabs.children].findIndex((t) => t.textContent.includes(cat));
    if (tabs.children[idx]) tabs.children[idx].classList.add("active");

    const listEl = container.querySelector("#journal-entries") || container;
    listEl.innerHTML = "";

    const filtered = cat === "all" ? entries : entries.filter((e) => e.category === cat);

    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i];
      const catInfo = CATEGORIES[entry.category] || CATEGORIES.other;
      const div = document.createElement("div");
      div.className = "journal-entry" + (entry.read ? "" : " unread");
      div.innerHTML = `
        <div class="journal-entry-header">
          <span class="journal-cat-icon" style="color:${catInfo.color}">${catInfo.icon}</span>
          <strong>${entry.title}</strong>
          ${!entry.read ? '<span class="journal-new">NEW</span>' : ""}
        </div>
        <div class="journal-entry-text">${entry.text}</div>
        <div class="journal-entry-date">${new Date(entry.discovered).toLocaleDateString()}</div>
      `;
      div.onclick = () => {
        const realIdx = entries.indexOf(entry);
        markRead(realIdx);
        div.classList.remove("unread");
        div.querySelector(".journal-new")?.remove();
      };
      listEl.appendChild(div);
    }
  }

  function getData() { return entries; }
  function restore(data) { entries = data || []; }

  return { init, add, markRead, getUnreadCount, getAll, count, parseLoreBlock, render, getData, restore };
})();
