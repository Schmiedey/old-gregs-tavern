/* ═══════════════════════════════════════════
   input.js — Keyboard & mouse input handler
   Tracks pressed keys, mouse position, clicks
   ═══════════════════════════════════════════ */

const Input = (() => {
  const keys = {};
  const justPressed = {};
  const justReleased = {};
  let mouseX = 0, mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;
  let enabled = true;

  function init() {
    window.addEventListener("keydown", (e) => {
      if (!enabled) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if (!keys[key]) justPressed[key] = true;
      keys[key] = true;
      // Prevent scrolling with arrow keys / space during gameplay
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key)) {
        const playScreen = document.getElementById("play-screen");
        if (playScreen && playScreen.classList.contains("active")) {
          e.preventDefault();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      keys[key] = false;
      justReleased[key] = true;
    });

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    window.addEventListener("mousedown", () => { mouseDown = true; mouseClicked = true; });
    window.addEventListener("mouseup", () => { mouseDown = false; });
  }

  function isDown(key) { return !!keys[key.toLowerCase()]; }
  function wasPressed(key) { return !!justPressed[key.toLowerCase()]; }
  function wasReleased(key) { return !!justReleased[key.toLowerCase()]; }
  function isMouseDown() { return mouseDown; }
  function wasMouseClicked() { return mouseClicked; }
  function getMouse() { return { x: mouseX, y: mouseY }; }

  // Call at end of each frame
  function endFrame() {
    for (const k in justPressed) delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
    mouseClicked = false;
  }

  function setEnabled(e) { enabled = e; }
  function isEnabled() { return enabled; }

  // Directional helpers
  function getDirection() {
    let dx = 0, dy = 0;
    if (isDown("w") || isDown("arrowup")) dy = -1;
    if (isDown("s") || isDown("arrowdown")) dy = 1;
    if (isDown("a") || isDown("arrowleft")) dx = -1;
    if (isDown("d") || isDown("arrowright")) dx = 1;
    return { dx, dy };
  }

  return {
    init, isDown, wasPressed, wasReleased, isMouseDown, wasMouseClicked,
    getMouse, endFrame, setEnabled, isEnabled, getDirection,
  };
})();
