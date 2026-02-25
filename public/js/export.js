/* ═══════════════════════════════════════════════
   export.js — Export adventure & share character
   Download .txt, share via base64 URL
   ═══════════════════════════════════════════════ */

const ExportShare = (() => {

  function exportAdventure(player, messages) {
    const lines = [];
    lines.push("═══════════════════════════════════════");
    lines.push("  OLD GREG'S TAVERN — Adventure Log");
    lines.push("═══════════════════════════════════════");
    lines.push("");
    lines.push(`Character: ${player.name}`);
    lines.push(`Race: ${player.race}  Class: ${player.class}  Level: ${player.level}`);
    lines.push(`HP: ${player.hp}/${player.maxHp}  Mana: ${player.mana}/${player.maxMana}  Gold: ${player.gold}`);
    lines.push(`Stats: ${Object.entries(player.stats).map(([k,v]) => `${k}:${v}`).join(" ")}`);
    lines.push(`Inventory: ${player.inventory.join(", ") || "empty"}`);
    lines.push(`Quests: ${player.quests.join(", ") || "none"}`);
    lines.push("");
    lines.push("═══════════════════════════════════════");
    lines.push("  ADVENTURE LOG");
    lines.push("═══════════════════════════════════════");
    lines.push("");

    const msgEls = messages.querySelectorAll(".msg");
    for (const msg of msgEls) {
      const author = msg.querySelector(".msg-author")?.textContent || "";
      const body = msg.querySelector(".msg-body")?.textContent || "";
      if (author) lines.push(`[${author}]`);
      lines.push(body);
      lines.push("");
    }

    lines.push("═══════════════════════════════════════");
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push("Play at: https://schmiedey.github.io/old-gregs-tavern/");

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `old-gregs-tavern-${player.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    return true;
  }

  function shareCharacter(player) {
    const data = {
      n: player.name,
      r: player.race,
      c: player.class,
      l: player.level,
      s: player.stats,
      hp: [player.hp, player.maxHp],
      mp: [player.mana, player.maxMana],
      g: player.gold,
      eq: player.equipment,
    };

    const encoded = btoa(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}?char=${encoded}`;

    // Copy to clipboard
    navigator.clipboard?.writeText(url).catch(() => {});

    return url;
  }

  function loadSharedCharacter() {
    const params = new URLSearchParams(window.location.search);
    const charData = params.get("char");
    if (!charData) return null;

    try {
      const data = JSON.parse(atob(charData));
      return {
        name: data.n,
        race: data.r,
        class: data.c,
        level: data.l,
        stats: data.s,
        hp: data.hp,
        mana: data.mp,
        gold: data.g,
        equipment: data.eq,
      };
    } catch {
      return null;
    }
  }

  return { exportAdventure, shareCharacter, loadSharedCharacter };
})();
