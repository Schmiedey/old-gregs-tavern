/* ═══════════════════════════════════════
   dice.js — Dice rolling utilities
   ═══════════════════════════════════════ */

const Dice = (() => {
  /**
   * Roll dice locally (visual only — authoritative rolls go through server)
   */
  function roll(sides = 20, count = 1) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return { sides, rolls, total: rolls.reduce((a, b) => a + b, 0) };
  }

  /**
   * Server-authoritative roll
   */
  async function serverRoll(sides = 20, count = 1) {
    try {
      const res = await fetch(`/api/roll/${sides}?n=${count}`);
      return await res.json();
    } catch {
      // Fallback to local
      return roll(sides, count);
    }
  }

  /**
   * Roll 4d6 drop lowest (for stat generation)
   */
  function rollStat() {
    const four = [roll(6).rolls[0], roll(6).rolls[0], roll(6).rolls[0], roll(6).rolls[0]];
    four.sort((a, b) => a - b);
    return four[1] + four[2] + four[3]; // drop lowest
  }

  /**
   * Generate a full set of 6 stats
   */
  function rollStats() {
    return {
      STR: rollStat(),
      DEX: rollStat(),
      CON: rollStat(),
      INT: rollStat(),
      WIS: rollStat(),
      CHA: rollStat(),
    };
  }

  /**
   * Calculate modifier from stat value
   */
  function modifier(stat) {
    return Math.floor((stat - 10) / 2);
  }

  /**
   * Format modifier as string (+2, -1, etc.)
   */
  function modStr(stat) {
    const mod = modifier(stat);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  /**
   * Show dice overlay animation
   */
  function showRollOverlay(value, sides, duration = 1200) {
    const overlay = document.getElementById("dice-overlay");
    const valEl = document.getElementById("dice-value");
    const labelEl = document.getElementById("dice-label");

    valEl.textContent = value;
    valEl.className = "dice-value";
    labelEl.textContent = `d${sides}`;

    if (value === sides) valEl.classList.add("crit");
    else if (value === 1) valEl.classList.add("fail");

    overlay.classList.remove("hidden");

    return new Promise((resolve) => {
      setTimeout(() => {
        overlay.classList.add("hidden");
        resolve(value);
      }, duration);
    });
  }

  return { roll, serverRoll, rollStat, rollStats, modifier, modStr, showRollOverlay };
})();
