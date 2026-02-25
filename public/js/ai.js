/* ═══════════════════════════════════════════════════════
   ai.js — AI Game Master: client-side streaming,
   memory/world state, NPC tracking, lore, scene images
   ═══════════════════════════════════════════════════════ */

const AI = (() => {
  const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
  const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
  const LOCAL_PROXY = "/api/chat";

  let apiKey = "";
  let model = DEFAULT_MODEL;
  let conversationHistory = [];
  let worldMemory = { npcsKnown: [], locationsVisited: [], majorChoices: [], lore: [] };
  let useProxy = false;
  let lastReq = 0;
  const MIN_INTERVAL = 1500;

  const SYSTEM_PROMPT = `You are **Old Greg**, the charismatic tavern-keeper and Game Master of "Old Greg's Tavern" — a 2D Zelda-style RPG.

The player moves around a graphical 2D top-down world. Your role is NPC DIALOGUE — you speak AS the NPC the player is talking to. Keep responses short and natural since they appear in a dialogue box.

RULES:
1. **Dialogue**: Speak in-character as the NPC. 1-3 sentences max. Punchy, colorful.
2. **NPCs**: Give personality and voice. Use "quotes" for speech.
3. **Loot** (when giving items):
   \`\`\`loot
   {"gold":15,"items":["Health Potion"],"xp":25}
   \`\`\`
4. **Quests** (when assigning/completing):
   \`\`\`quest
   {"action":"add","quest":"Find the Lost Amulet"}
   \`\`\`
5. **NPC info** (when introducing):
   \`\`\`npc
   {"name":"Bartok","race":"Dwarf","role":"Blacksmith","disposition":"friendly"}
   \`\`\`
6. **Lore** (when revealing history):
   \`\`\`lore
   {"title":"The Fall of Eldermoor","category":"history","text":"Long ago, the great fortress fell..."}
   \`\`\`
7. **Keep it SHORT**: 1-3 sentences of dialogue. This appears in a small dialogue box.
8. **The Tavern**: Home base at a crossroads in Eldermoor.
9. **Setting**: Medieval fantasy. The player explores a 2D world with towns, forests, caves, and dungeons.
10. **NEVER** give numbered options — the player moves freely in the graphical world.
11. **Always complete your sentences.** Never cut off mid-thought.`;


  function configure(key, selectedModel, proxy = false) {
    apiKey = key || window.GAME_CONFIG?.apiKey || "";
    model = selectedModel || DEFAULT_MODEL;
    useProxy = proxy;
  }

  function init(characterSummary) {
    conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `PLAYER CHARACTER:\n${characterSummary}\n\nBEGIN: The player walks through the oak door of Old Greg's Tavern on a stormy night. Describe the tavern, introduce yourself (Old Greg), hint at adventure. Include a \`\`\`location block, a \`\`\`scene block, and a \`\`\`npc block for Old Greg. End with options.` },
    ];
    worldMemory = { npcsKnown: [], locationsVisited: ["Old Greg's Tavern"], majorChoices: [], lore: [] };
  }

  function addMessage(role, content) {
    conversationHistory.push({ role, content });
    if (conversationHistory.length > 50) {
      const sys = conversationHistory.filter((m) => m.role === "system");
      conversationHistory = [...sys, ...conversationHistory.slice(-24)];
    }
  }

  function updateMemory(key, value) {
    if (Array.isArray(worldMemory[key]) && !worldMemory[key].includes(value)) worldMemory[key].push(value);
  }

  function getMemorySummary() {
    const npcSummary = typeof NPCs !== "undefined" ? NPCs.getForAI() : worldMemory.npcsKnown.join(", ") || "none";
    return `[WORLD] NPCs: ${npcSummary}. Places: ${worldMemory.locationsVisited.join(", ")}. Choices: ${worldMemory.majorChoices.slice(-5).join("; ") || "none"}.`;
  }

  async function sendStreaming(playerMessage, characterSummary, onToken) {
    const now = Date.now();
    const wait = MIN_INTERVAL - (now - lastReq);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastReq = Date.now();

    addMessage("user", `${getMemorySummary()}\n[Char: ${characterSummary}]\n\nPlayer: ${playerMessage}`);
    document.getElementById("loading")?.classList.remove("hidden");

    try {
      const url = useProxy ? LOCAL_PROXY : OPENROUTER_URL;
      const headers = { "Content-Type": "application/json" };
      if (!useProxy) {
        const key = apiKey || window.GAME_CONFIG?.apiKey || "";
        headers["Authorization"] = "Bearer " + key;
        headers["HTTP-Referer"] = window.location.origin;
        headers["X-Title"] = "Old Greg's Tavern";
      }

      const response = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify({ model, messages: conversationHistory, temperature: 0.85, max_tokens: 1024, stream: true }),
      });

      if (!response.ok) throw new Error("API " + response.status + ": " + (await response.text()).slice(0, 200));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "", buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") break;
          try {
            const token = JSON.parse(data).choices?.[0]?.delta?.content || "";
            if (token) { full += token; onToken(token); }
          } catch {}
        }
      }

      if (!full) return await sendNonStreaming(playerMessage, characterSummary, onToken);
      addMessage("assistant", full);
      return full;
    } catch (err) {
      console.error("AI:", err);
      const msg = `*(Old Greg fumbles…)* Something went wrong.\n\n_${err.message}_`;
      onToken(msg);
      return msg;
    } finally {
      document.getElementById("loading")?.classList.add("hidden");
    }
  }

  async function sendNonStreaming(playerMessage, characterSummary, onToken) {
    try {
      const url = useProxy ? LOCAL_PROXY : OPENROUTER_URL;
      const headers = { "Content-Type": "application/json" };
      if (!useProxy) {
        const key = apiKey || window.GAME_CONFIG?.apiKey || "";
        headers["Authorization"] = "Bearer " + key;
        headers["HTTP-Referer"] = window.location.origin;
        headers["X-Title"] = "Old Greg's Tavern";
      }
      const response = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify({ model, messages: conversationHistory, temperature: 0.85, max_tokens: 1024 }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "*(Silence…)*";
      addMessage("assistant", reply);
      for (const ch of reply) { onToken(ch); await new Promise((r) => setTimeout(r, 6)); }
      return reply;
    } catch (err) {
      const msg = "Error: " + err.message;
      onToken(msg);
      return msg;
    }
  }

  function parseBlocks(text) {
    const blocks = { combat: null, checks: [], loot: [], quests: [], locations: [], scenes: [], npcs: [], loreEntries: [], narrative: text };
    const patterns = [
      { key: "combat",     re: /```combat\s*\n?([\s\S]*?)```/g, single: true },
      { key: "checks",     re: /```check\s*\n?([\s\S]*?)```/g },
      { key: "loot",       re: /```loot\s*\n?([\s\S]*?)```/g },
      { key: "quests",     re: /```quest\s*\n?([\s\S]*?)```/g },
      { key: "locations",  re: /```location\s*\n?([\s\S]*?)```/g },
      { key: "scenes",     re: /```scene\s*\n?([\s\S]*?)```/g },
      { key: "npcs",       re: /```npc\s*\n?([\s\S]*?)```/g },
      { key: "loreEntries",re: /```lore\s*\n?([\s\S]*?)```/g },
    ];
    for (const p of patterns) {
      let m;
      while ((m = p.re.exec(text))) {
        try { const parsed = JSON.parse(m[1].trim()); p.single ? (blocks[p.key] = parsed) : blocks[p.key].push(parsed); } catch {}
      }
    }
    blocks.narrative = text.replace(/```(?:combat|check|loot|quest|location|scene|npc|lore)\s*\n?[\s\S]*?```/g, "").trim();
    return blocks;
  }

  function parseOptions(narrative) {
    const options = [];
    const re = /^\s*(\d+)\.\s*(.+)$/gm;
    let m;
    while ((m = re.exec(narrative))) options.push(m[2].trim());
    return options;
  }

  function getConversationHistory() { return conversationHistory; }
  function setConversationHistory(h) { conversationHistory = h; }
  function getModel() { return model; }
  function getWorldMemory() { return worldMemory; }
  function setWorldMemory(m) { worldMemory = m; }

  return {
    configure, init, addMessage, updateMemory,
    sendStreaming, parseBlocks, parseOptions,
    getConversationHistory, setConversationHistory,
    getModel, getWorldMemory, setWorldMemory,
    getHistory: getConversationHistory,
    setHistory: setConversationHistory,
  };
})();
