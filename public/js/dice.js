/* ═══════════════════════════════════════
   dice.js — Dice engine + roll history
   ═══════════════════════════════════════ */

const Dice = (() => {
  const history = [];
  const MAX_HISTORY = 50;

  function roll(sides = 20, count = 1) {
    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
    return { sides, rolls, total: rolls.reduce((a, b) => a + b, 0) };
  }

  function rollAndLog(sides = 20, count = 1, label = "") {
    const result = roll(sides, count);
    history.unshift({ timestamp: Date.now(), label, sides, rolls: result.rolls, total: result.total });
    if (history.length > MAX_HISTORY) history.pop();
    return result;
  }

  function rollStat() {
    const four = Array.from({ length: 4 }, () => roll(6).rolls[0]);
    four.sort((a, b) => a - b);
    return four[1] + four[2] + four[3];
  }

  function rollStats() {
    return { STR: rollStat(), DEX: rollStat(), CON: rollStat(), INT: rollStat(), WIS: rollStat(), CHA: rollStat() };
  }

  function modifier(stat) { return Math.floor((stat - 10) / 2); }
  function modStr(stat) { const m = modifier(stat); return m >= 0 ? `+${m}` : `${m}`; }

  function getHistory() { return history; }
  function clearHistory() { history.length = 0; }

  function renderHistory(container) {
    container.innerHTML = "";
    if (history.length === 0) {
      container.innerHTML = '<div class="dice-hist-empty">No rolls yet</div>';
      return;
    }
    for (const h of history) {
      const div = document.createElement("div");
      div.className = "dice-hist-entry";
      const time = new Date(h.timestamp).toLocaleTimeString();
      const isCrit = h.sides === 20 && h.rolls[0] === 20;
      const isFail = h.sides === 20 && h.rolls[0] === 1;
      div.innerHTML = `
        <span class="dice-hist-time">${time}</span>
        <span class="dice-hist-label">${h.label || "d" + h.sides}</span>
        <span class="dice-hist-result ${isCrit ? "crit" : ""} ${isFail ? "fail" : ""}">[${h.rolls.join(", ")}] = ${h.total}</span>
      `;
      container.appendChild(div);
    }
  }

  function showRollOverlay(value, sides, duration = 1100) {
    Sound.diceRoll();
    const overlay = document.getElementById("dice-overlay");
    const valEl = document.getElementById("dice-value");
    const labelEl = document.getElementById("dice-label");

    valEl.textContent = value;
    valEl.className = "dice-value";
    labelEl.textContent = "d" + sides;
    if (value === sides) valEl.classList.add("crit");
    else if (value === 1) valEl.classList.add("fail");

    overlay.classList.remove("hidden");
    return new Promise((resolve) => {
      setTimeout(() => { overlay.classList.add("hidden"); resolve(value); }, duration);
    });
  }

  return { roll, rollAndLog, rollStat, rollStats, modifier, modStr, getHistory, clearHistory, renderHistory, showRollOverlay };
})();
