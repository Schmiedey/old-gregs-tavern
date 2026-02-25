/* ═══════════════════════════════════════════════
   images.js — AI scene image generation
   Uses Pollinations.ai (free, no API key needed)
   ═══════════════════════════════════════════════ */

const SceneImages = (() => {
  const BASE_URL = "https://image.pollinations.ai/prompt/";
  const WIDTH = 768;
  const HEIGHT = 400;
  const STYLE_SUFFIX = ", dark fantasy art style, painterly, atmospheric lighting, dungeons and dragons, highly detailed";

  let currentUrl = "";
  let imageEl = null;
  let containerEl = null;
  let cache = new Map();
  let loading = false;

  function init(container, img) {
    containerEl = container;
    imageEl = img;
  }

  function buildUrl(prompt) {
    const full = prompt + STYLE_SUFFIX;
    const encoded = encodeURIComponent(full);
    return `${BASE_URL}${encoded}?width=${WIDTH}&height=${HEIGHT}&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
  }

  function show(prompt, mood) {
    if (!imageEl || !containerEl || !prompt) return;

    const cacheKey = prompt.toLowerCase().trim().slice(0, 80);
    if (cache.has(cacheKey)) {
      applyImage(cache.get(cacheKey));
      return;
    }

    loading = true;
    containerEl.classList.add("scene-loading");

    // Apply mood-based gradient while loading
    const moodGradients = {
      dark: "linear-gradient(135deg, #0a0a1a, #1a0a2e)",
      bright: "linear-gradient(135deg, #2a3a5a, #4a5a8a)",
      warm: "linear-gradient(135deg, #2a1a0a, #4a2a1a)",
      cold: "linear-gradient(135deg, #0a1a2a, #1a2a4a)",
      mystical: "linear-gradient(135deg, #1a0a3a, #3a1a5a)",
      danger: "linear-gradient(135deg, #2a0a0a, #4a1a1a)",
      peaceful: "linear-gradient(135deg, #0a2a1a, #1a3a2a)",
    };
    containerEl.style.background = moodGradients[mood] || moodGradients.dark;

    const url = buildUrl(prompt);
    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous";

    tempImg.onload = () => {
      cache.set(cacheKey, url);
      if (cache.size > 20) {
        const first = cache.keys().next().value;
        cache.delete(first);
      }
      applyImage(url);
      loading = false;
      containerEl.classList.remove("scene-loading");
    };

    tempImg.onerror = () => {
      loading = false;
      containerEl.classList.remove("scene-loading");
    };

    tempImg.src = url;
  }

  function applyImage(url) {
    if (!imageEl) return;
    currentUrl = url;
    imageEl.style.backgroundImage = `url('${url}')`;
    imageEl.classList.add("scene-loaded");
    setTimeout(() => imageEl.classList.remove("scene-loaded"), 600);
  }

  function extractScenePrompt(text) {
    // Try to extract from ```scene block first
    const m = text.match(/```scene\s*\n?([\s\S]*?)```/);
    if (m) {
      try {
        const data = JSON.parse(m[1].trim());
        return { prompt: data.prompt || data.image_prompt || "", mood: data.mood || "dark" };
      } catch {}
    }
    // Fallback: extract descriptive keywords from narrative
    const clean = text.replace(/```[\s\S]*?```/g, "").replace(/\d+\..+$/gm, "").trim();
    const sentences = clean.split(/[.!?]+/).slice(0, 2).join(". ");
    return { prompt: sentences.slice(0, 200), mood: guessMood(text) };
  }

  function guessMood(text) {
    const t = text.toLowerCase();
    if (t.includes("dark") || t.includes("shadow") || t.includes("night")) return "dark";
    if (t.includes("bright") || t.includes("sun") || t.includes("light")) return "bright";
    if (t.includes("tavern") || t.includes("fire") || t.includes("warm")) return "warm";
    if (t.includes("ice") || t.includes("snow") || t.includes("cold")) return "cold";
    if (t.includes("magic") || t.includes("glow") || t.includes("mystic")) return "mystical";
    if (t.includes("blood") || t.includes("battle") || t.includes("danger")) return "danger";
    if (t.includes("peaceful") || t.includes("calm") || t.includes("meadow")) return "peaceful";
    return "dark";
  }

  function getCurrent() { return currentUrl; }
  function isLoading() { return loading; }
  function clearCache() { cache.clear(); }

  return { init, show, extractScenePrompt, guessMood, getCurrent, isLoading, clearCache, buildUrl };
})();
