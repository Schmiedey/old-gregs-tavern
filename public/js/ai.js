/* ═══════════════════════════════════════════════════════
   ai.js — AI Game Master: client-side streaming,
   memory/world state, model selection, rate limiting
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

  const SYSTEM_PROMPT = `You are **Old Greg**, the charismatic, slightly eccentric tavern-keeper and Game Master of "Old Greg's Tavern" — a D&D-lite text adventure RPG.

PERSONALITY:
- Speak with colour: dramatic narration, punchy combat, colourful NPC voices.
- Occasional dry humour. You love your tavern.
- Address the player by name. Use second person ("You step forward…").

RULES:
1. **Exploration**: Describe environments vividly (2-4 sentences). Offer 2-4 numbered options at the end.
2. **NPCs**: Give NPCs names, personalities, motives. Use dialogue in quotes.
3. **Combat**: Output a JSON block:
   \`\`\`combat
   {"enemies":[{"name":"Goblin Scout","hp":15,"ac":12,"atk":4}],"description":"A goblin leaps from the shadows!"}
   \`\`\`
4. **Skill Checks**:
   \`\`\`check
   {"stat":"DEX","dc":14,"description":"Leap across the chasm"}
   \`\`\`
5. **Loot**:
   \`\`\`loot
   {"gold":15,"items":["Health Potion"],"xp":25}
   \`\`\`
6. **Quests**:
   \`\`\`quest
   {"action":"add","quest":"Find the Lost Amulet"}
   \`\`\`
7. **Locations** (when player moves to new area):
   \`\`\`location
   {"name":"Dark Forest","type":"wilderness","connections":["Old Greg's Tavern","Goblin Cave"]}
   \`\`\`
8. **Story Flow**: Coherent narrative. Build tension. Meaningful choices. Absurd player actions get creative consequences.
9. **The Tavern**: Home base at a crossroads in Eldermoor.
10. **Options**: ALWAYS end with 2-4 numbered options like:
    1. ⚔️ Draw your sword
    2. 🗣️ Negotiate
    3. 🏃 Retreat
11. **Length**: 100-200 words. Punchy.

FORMAT: Use **bold**, *italic*, "quotes". Embed code blocks inline. Always end with numbered options.`;

  function configure(key, selectedModel, proxy = false) {
    apiKey = key; model = selectedModel || DEFAULT_MODEL; useProxy = proxy;
  }

  function init(characterSummary) {
    conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `PLAYER CHARACTER:\n${characterSummary}\n\nBEGIN: The player walks through the oak door of Old Greg's Tavern on a stormy night. Describe the tavern, introduce yourself (Old Greg), hint at adventure. Include a \`\`\`location block. End with options.` },
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
    return `[WORLD] NPCs: ${worldMemory.npcsKnown.join(", ") || "none"}. Places: ${worldMemory.locationsVisited.join(", ")}. Choices: ${worldMemory.majorChoices.slice(-5).join("; ") || "none"}.`;
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
        headers["Authorization"] = "Bearer " + apiKey;
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
        headers["Authorization"] = "Bearer " + apiKey;
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
    const blocks = { combat: null, checks: [], loot: [], quests: [], locations: [], narrative: text };
    const patterns = [
      { key: "combat", re: /```combat\s*\n?([\s\S]*?)```/g, single: true },
      { key: "checks", re: /```check\s*\n?([\s\S]*?)```/g },
      { key: "loot",   re: /```loot\s*\n?([\s\S]*?)```/g },
      { key: "quests", re: /```quest\s*\n?([\s\S]*?)```/g },
      { key: "locations", re: /```location\s*\n?([\s\S]*?)```/g },
    ];
    for (const p of patterns) {
      let m;
      while ((m = p.re.exec(text))) {
        try { const parsed = JSON.parse(m[1].trim()); p.single ? (blocks[p.key] = parsed) : blocks[p.key].push(parsed); } catch {}
      }
    }
    blocks.narrative = text.replace(/```(?:combat|check|loot|quest|location)\s*\n?[\s\S]*?```/g, "").trim();
    return blocks;
  }

  function parseOptions(narrative) {
    const options = [];
    let m;
    const re = /^\s*(\d+)\.\s*(.+)$/gm;
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
  };
})();
