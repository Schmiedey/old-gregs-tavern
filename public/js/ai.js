/* ═══════════════════════════════════════════
   ai.js — AI Game Master (OpenRouter proxy)
   ═══════════════════════════════════════════ */

const AI = (() => {
  const SYSTEM_PROMPT = `You are **Old Greg**, the charismatic, slightly eccentric tavern-keeper and Game Master of "Old Greg's Tavern" — a D&D-lite text adventure RPG.

PERSONALITY:
- Speak with colour: dramatic narration for scenes, punchy combat descriptions, colourful NPC voices.
- Occasionally break the fourth wall with dry humour. You love your tavern.
- Address the player by name. React to their choices meaningfully.
- Use second person ("You step forward…").

RULES YOU ENFORCE:
1. **Exploration**: Describe environments vividly (2-4 sentences). Always offer 2-4 clear options at the end, formatted as a numbered list.
2. **NPCs**: Give NPCs names, personalities, and motives. Use dialogue in quotes.
3. **Combat**: When combat begins, output a JSON block inside \`\`\`combat tags:
   \`\`\`combat
   {"enemy":"Goblin Scout","enemy_hp":15,"enemy_ac":12,"enemy_atk":4,"description":"A wiry goblin leaps from the shadows, rusty blade gleaming!"}
   \`\`\`
   After the combat JSON, narrate the start of combat.
4. **Skill Checks**: When the player attempts something risky, call for a check by outputting:
   \`\`\`check
   {"stat":"DEX","dc":14,"description":"Leap across the chasm"}
   \`\`\`
5. **Loot & Rewards**: When appropriate, output:
   \`\`\`loot
   {"gold":15,"items":["Health Potion"],"xp":25}
   \`\`\`
6. **Quest Updates**: When a quest starts or completes:
   \`\`\`quest
   {"action":"add","quest":"Find the Lost Amulet"}
   \`\`\`
   or
   \`\`\`quest
   {"action":"complete","quest":"Find the Lost Amulet"}
   \`\`\`
7. **Story Flow**: Keep a coherent narrative. Build tension. Offer meaningful choices. If the player does something absurd, play along creatively but keep consequences realistic.
8. **The Tavern**: Old Greg's Tavern is always the home base. Adventures begin and end there. It sits at a crossroads in the fantasy realm of Eldermoor.
9. **Options**: ALWAYS end your response with 2-4 numbered options for the player, like:
   1. ⚔️ Draw your sword and charge
   2. 🗣️ Try to negotiate
   3. 🏃 Retreat to the corridor
10. **Length**: Keep responses 100-200 words. Punchy, not verbose.

RESPONSE FORMAT:
- Use markdown: **bold** for emphasis, *italic* for thoughts/atmosphere, "quotes" for speech.
- Embed combat/check/loot/quest code blocks INLINE in your narrative when triggered.
- Always include numbered options at the end.`;

  let conversationHistory = [];

  function init(characterSummary) {
    conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `PLAYER CHARACTER:\n${characterSummary}\n\nBegin the adventure. The player has just walked through the heavy oak door of Old Greg's Tavern on a stormy night. Describe the tavern scene vividly, introduce yourself (Old Greg) as the barkeep, and hint at adventure hooks. End with options.`,
      },
    ];
  }

  function addMessage(role, content) {
    conversationHistory.push({ role, content });
    // Keep context window manageable — trim old messages but keep system prompts
    if (conversationHistory.length > 40) {
      const system = conversationHistory.filter((m) => m.role === "system");
      const recent = conversationHistory.slice(-20);
      conversationHistory = [...system, ...recent];
    }
  }

  async function send(playerMessage, characterSummary) {
    addMessage("user", `[Character State: ${characterSummary}]\n\nPlayer action: ${playerMessage}`);

    const loading = document.getElementById("loading");
    loading.classList.remove("hidden");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          temperature: 0.85,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "*(The Game Master is momentarily speechless…)*";
      addMessage("assistant", reply);
      return reply;
    } catch (err) {
      console.error("AI error:", err);
      return `*(Old Greg fumbles with his notes…)* Apologies, adventurer — a magical disturbance interrupted my thoughts. Try again!\n\n_Error: ${err.message}_`;
    } finally {
      loading.classList.add("hidden");
    }
  }

  /**
   * Parse special code blocks from GM response
   */
  function parseBlocks(text) {
    const blocks = { combat: null, checks: [], loot: [], quests: [], narrative: text };

    // Extract ```combat blocks
    const combatRe = /```combat\s*\n?([\s\S]*?)```/g;
    let m;
    while ((m = combatRe.exec(text))) {
      try { blocks.combat = JSON.parse(m[1].trim()); } catch {}
    }

    // Extract ```check blocks
    const checkRe = /```check\s*\n?([\s\S]*?)```/g;
    while ((m = checkRe.exec(text))) {
      try { blocks.checks.push(JSON.parse(m[1].trim())); } catch {}
    }

    // Extract ```loot blocks
    const lootRe = /```loot\s*\n?([\s\S]*?)```/g;
    while ((m = lootRe.exec(text))) {
      try { blocks.loot.push(JSON.parse(m[1].trim())); } catch {}
    }

    // Extract ```quest blocks
    const questRe = /```quest\s*\n?([\s\S]*?)```/g;
    while ((m = questRe.exec(text))) {
      try { blocks.quests.push(JSON.parse(m[1].trim())); } catch {}
    }

    // Clean narrative (remove code blocks)
    blocks.narrative = text
      .replace(/```(?:combat|check|loot|quest)\s*\n?[\s\S]*?```/g, "")
      .trim();

    return blocks;
  }

  /**
   * Parse numbered options from narrative text
   */
  function parseOptions(narrative) {
    const options = [];
    const re = /^\s*(\d+)\.\s*(.+)$/gm;
    let m;
    while ((m = re.exec(narrative))) {
      options.push(m[2].trim());
    }
    return options;
  }

  return { init, send, parseBlocks, parseOptions, addMessage };
})();
