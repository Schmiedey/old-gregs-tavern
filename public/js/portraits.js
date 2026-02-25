/* ═══════════════════════════════════════════
   portraits.js — Dynamic character portraits
   SVG/emoji composites by race + class
   ═══════════════════════════════════════════ */

const Portraits = (() => {
  const RACE_ICONS = {
    Human: "🧑", Elf: "🧝", Dwarf: "⛏️", Halfling: "🦶", Orc: "👹", Tiefling: "😈",
  };

  const CLASS_ICONS = {
    Warrior: "⚔️", Mage: "🔮", Rogue: "🗡️", Cleric: "✝️", Ranger: "🏹", Bard: "🎵",
  };

  const RACE_COLORS = {
    Human: { skin: "#d4a574", hair: "#4a3728", accent: "#8b7355" },
    Elf: { skin: "#f0e6d2", hair: "#c4a35a", accent: "#7ab648" },
    Dwarf: { skin: "#c9956b", hair: "#8b4513", accent: "#cd853f" },
    Halfling: { skin: "#e0c4a0", hair: "#6b4423", accent: "#daa520" },
    Orc: { skin: "#5a7a4a", hair: "#2d3a22", accent: "#8b0000" },
    Tiefling: { skin: "#8b3a62", hair: "#1a0a2e", accent: "#ff4500" },
  };

  const CLASS_GEAR = {
    Warrior: { symbol: "⚔️", color: "#c44" },
    Mage: { symbol: "🔮", color: "#a6d" },
    Rogue: { symbol: "🗡️", color: "#555" },
    Cleric: { symbol: "✝️", color: "#ffd700" },
    Ranger: { symbol: "🏹", color: "#5a5" },
    Bard: { symbol: "🎵", color: "#58c" },
  };

  function generate(race, charClass) {
    const rc = RACE_COLORS[race] || RACE_COLORS.Human;
    const gear = CLASS_GEAR[charClass] || CLASS_GEAR.Warrior;

    return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pg" cx="50%" cy="40%"><stop offset="0%" stop-color="${rc.accent}" stop-opacity="0.3"/><stop offset="100%" stop-color="transparent"/></radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="120" height="140" rx="12" fill="#1a1a2e" stroke="${gear.color}" stroke-width="2"/>
      <circle cx="60" cy="140" r="80" fill="url(#pg)"/>
      <!-- Head -->
      <ellipse cx="60" cy="52" rx="24" ry="28" fill="${rc.skin}"/>
      <!-- Hair -->
      <ellipse cx="60" cy="38" rx="26" ry="18" fill="${rc.hair}"/>
      <!-- Eyes -->
      <ellipse cx="50" cy="52" rx="3" ry="3" fill="#fff"/>
      <ellipse cx="70" cy="52" rx="3" ry="3" fill="#fff"/>
      <circle cx="51" cy="52" r="1.5" fill="#222"/>
      <circle cx="71" cy="52" r="1.5" fill="#222"/>
      <!-- Body -->
      <rect x="38" y="78" width="44" height="50" rx="8" fill="${gear.color}" opacity="0.8"/>
      <rect x="42" y="82" width="36" height="42" rx="6" fill="${rc.accent}" opacity="0.3"/>
      <!-- Class symbol -->
      <text x="60" y="110" text-anchor="middle" font-size="20" filter="url(#glow)">${gear.symbol}</text>
      ${race === "Orc" ? '<rect x="52" y="62" width="4" height="6" rx="1" fill="#fff"/><rect x="64" y="62" width="4" height="6" rx="1" fill="#fff"/>' : ""}
      ${race === "Elf" ? '<polygon points="32,45 24,35 34,42" fill="'+rc.skin+'"/><polygon points="88,45 96,35 86,42" fill="'+rc.skin+'"/>' : ""}
      ${race === "Tiefling" ? '<path d="M42,30 Q45,15 52,28" fill="'+rc.accent+'" stroke="'+rc.accent+'"/><path d="M78,30 Q75,15 68,28" fill="'+rc.accent+'" stroke="'+rc.accent+'"/>' : ""}
      ${race === "Dwarf" ? '<rect x="42" y="58" width="36" height="12" rx="4" fill="'+rc.hair+'" opacity="0.8"/>' : ""}
    </svg>`;
  }

  function getEmoji(race, charClass) {
    return `${RACE_ICONS[race] || "🧑"}${CLASS_ICONS[charClass] || "⚔️"}`;
  }

  function render(container, race, charClass) {
    container.innerHTML = generate(race, charClass);
  }

  return { generate, getEmoji, render, RACE_ICONS, CLASS_ICONS };
})();
