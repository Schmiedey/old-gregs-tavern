/* ═══════════════════════════════════════════
   dialogue.js — RPG dialogue box system
   Typewriter text, choices, NPC portraits
   AI-powered contextual dialogue
   ═══════════════════════════════════════════ */

const Dialogue = (() => {
  let open = false;
  let currentText = "";
  let displayedText = "";
  let charIndex = 0;
  let typeTimer = 0;
  const TYPE_SPEED = 25; // ms per char
  let choices = [];
  let onChoiceCallback = null;
  let speaker = "";
  let pages = [];
  let currentPage = 0;
  let waitingForInput = false;
  let aiPending = false;

  function isOpen() { return open; }

  function show(speakerName, text, choicesList, onChoice) {
    open = true;
    speaker = speakerName;
    choices = choicesList || [];
    onChoiceCallback = onChoice || null;
    waitingForInput = false;

    // Split long text into pages
    if (text.length > 200) {
      const words = text.split(" ");
      pages = [];
      let page = "";
      for (const w of words) {
        if ((page + " " + w).length > 180) {
          pages.push(page.trim());
          page = w;
        } else {
          page += " " + w;
        }
      }
      if (page.trim()) pages.push(page.trim());
    } else {
      pages = [text];
    }

    currentPage = 0;
    startPage(pages[0]);
    updateDOM();
    Input.setEnabled(true);
  }

  function startPage(text) {
    currentText = text;
    displayedText = "";
    charIndex = 0;
    typeTimer = 0;
    waitingForInput = false;
  }

  function update(dt) {
    if (!open) return;

    if (charIndex < currentText.length) {
      typeTimer += dt;
      while (typeTimer >= TYPE_SPEED && charIndex < currentText.length) {
        displayedText += currentText[charIndex];
        charIndex++;
        typeTimer -= TYPE_SPEED;
      }
      updateTextDOM();
    } else if (!waitingForInput) {
      waitingForInput = true;
      showContinuePrompt();
    }

    // Handle input
    if (Input.wasPressed("e") || Input.wasPressed("enter") || Input.wasPressed(" ")) {
      if (charIndex < currentText.length) {
        // Skip typewriter
        displayedText = currentText;
        charIndex = currentText.length;
        updateTextDOM();
      } else if (choices.length > 0) {
        // Choices are shown — handled by click
      } else if (currentPage < pages.length - 1) {
        // Next page
        currentPage++;
        startPage(pages[currentPage]);
        updateDOM();
      } else {
        // Close
        close();
      }
    }
  }

  function close() {
    open = false;
    const box = document.getElementById("dialogue-box");
    if (box) box.classList.add("hidden");
  }

  function selectChoice(index) {
    if (onChoiceCallback) {
      const choice = choices[index];
      close();
      onChoiceCallback(choice, index);
    } else {
      close();
    }
  }

  function updateDOM() {
    const box = document.getElementById("dialogue-box");
    if (!box) return;
    box.classList.remove("hidden");

    const speakerEl = document.getElementById("dialogue-speaker");
    const textEl = document.getElementById("dialogue-text");
    const choicesEl = document.getElementById("dialogue-choices");
    const continueEl = document.getElementById("dialogue-continue");
    const portraitEl = document.getElementById("dialogue-portrait");

    if (speakerEl) speakerEl.textContent = speaker;
    if (textEl) textEl.textContent = displayedText;
    if (continueEl) continueEl.classList.add("hidden");

    if (portraitEl) {
      portraitEl.textContent = speaker === "Old Greg" ? "🍺" :
        speaker.includes("Guard") ? "🛡️" :
        speaker.includes("Merchant") || speaker.includes("Barmaid") ? "🪙" :
        speaker.includes("Hermit") ? "🧙" : "👤";
    }

    if (choicesEl) {
      choicesEl.innerHTML = "";
      if (choices.length > 0 && charIndex >= currentText.length) {
        choices.forEach((c, i) => {
          const btn = document.createElement("button");
          btn.className = "dialogue-choice-btn";
          btn.textContent = `${i + 1}. ${c}`;
          btn.onclick = () => selectChoice(i);
          choicesEl.appendChild(btn);
        });
      }
    }
  }

  function updateTextDOM() {
    const textEl = document.getElementById("dialogue-text");
    if (textEl) textEl.textContent = displayedText;
  }

  function showContinuePrompt() {
    const choicesEl = document.getElementById("dialogue-choices");
    const continueEl = document.getElementById("dialogue-continue");

    if (choices.length > 0 && currentPage >= pages.length - 1) {
      // Show choices
      if (choicesEl) {
        choicesEl.innerHTML = "";
        choices.forEach((c, i) => {
          const btn = document.createElement("button");
          btn.className = "dialogue-choice-btn";
          btn.textContent = `${i + 1}. ${c}`;
          btn.onclick = () => selectChoice(i);
          choicesEl.appendChild(btn);
        });
      }
    } else if (currentPage < pages.length - 1) {
      if (continueEl) {
        continueEl.classList.remove("hidden");
        continueEl.textContent = "▼ E to continue";
      }
    } else {
      if (continueEl) {
        continueEl.classList.remove("hidden");
        continueEl.textContent = "▼ E to close";
      }
    }
  }

  /* ─── AI-powered dialogue ─── */
  async function showAIDialogue(npcName, npcDialogueId, charData, onDone) {
    aiPending = true;
    show(npcName, "...", []);

    const prompt = getDialoguePrompt(npcName, npcDialogueId, charData);

    try {
      let fullText = "";
      await AI.sendStreaming(
        prompt,
        Character.getSummary(charData),
        (token) => {
          fullText += token;
          // Clean out any code blocks for display
          const clean = fullText.replace(/```[\s\S]*?```/g, "").trim();
          if (clean) {
            currentText = clean;
            // Let typewriter catch up
          }
        }
      );

      // Parse AI response for game blocks
      const blocks = AI.parseBlocks(fullText);

      // Extract choices from AI
      const options = AI.parseOptions(blocks.narrative);
      const cleanNarrative = blocks.narrative.replace(/^\s*\d+\.\s*.+$/gm, "").trim();

      // Close and reshow with proper text + choices
      close();

      // Process loot, quests, etc.
      processAIBlocks(blocks, charData);

      // Show final dialogue
      show(npcName, cleanNarrative || "...", options.length > 0 ? options : [], (choice) => {
        if (choice && onDone) onDone(choice);
      });

    } catch (err) {
      console.error("AI dialogue error:", err);
      close();
      show(npcName, "*They seem distracted...*", ["Farewell"], () => {});
    }

    aiPending = false;
  }

  function getDialoguePrompt(npcName, dialogueId, charData) {
    const prompts = {
      old_greg_intro: `The player approaches Old Greg, the tavern owner. Old Greg is a weathered but jovial man who loves telling stories. Greet them warmly, mention rumours of trouble in the forest, and offer a quest. Keep response under 150 words. End with 2-3 choices.`,
      barmaid: `The player talks to Barmaid Elara. She's friendly and gossips about the town. She sells drinks and potions. Describe what she offers and any rumors she's heard. Keep response under 120 words. End with 2-3 choices. Include a \`\`\`loot block if they buy something.`,
      stranger: `A mysterious hooded stranger sits in the corner. They speak cryptically about an ancient dungeon beneath the caves. Keep response under 120 words. End with 2-3 choices.`,
      guard_captain: `The Guard Captain is stern but fair. He's worried about increasing monster activity. He may offer a bounty quest. Keep response under 120 words. End with 2-3 choices.`,
      merchant: `Merchant Tomas sells weapons, armor, and supplies. List 3-4 items with prices. Keep response under 120 words. End with 2-3 choices.`,
      villager: `A simple villager shares gossip about the town. They mention something interesting nearby. Keep under 100 words. End with 2 choices.`,
      hermit: `A forest hermit who knows ancient magic. They can teach the player something useful. Keep under 120 words. End with 2-3 choices.`,
      wandering_merchant: `A traveling merchant on the road. They sell rare items at marked-up prices. Keep under 120 words. End with 2-3 choices.`,
      gate_guard: `A gate guard who warns about dangers beyond the walls. Keep under 100 words. End with 2 choices.`,
    };

    return `You are ${npcName} in a medieval fantasy world. ${prompts[dialogueId] || "Have a brief conversation with the adventurer. Keep under 100 words. End with 2 choices."}`;
  }

  function processAIBlocks(blocks, charData) {
    // Process loot
    for (const loot of blocks.loot || []) {
      if (loot.gold) { charData.gold += loot.gold; Sound.gold(); HUD.toast(`+${loot.gold} gold!`); }
      if (loot.items) { for (const i of loot.items) { charData.inventory.push(i); HUD.toast(`Got: ${i}`); } }
      if (loot.xp) {
        const leveled = Character.addXp(charData, loot.xp);
        if (leveled) { Sound.levelUp(); HUD.toast(`Level Up! Level ${charData.level}!`, "#ffd700"); }
      }
    }

    // Process quests
    for (const q of blocks.quests || []) {
      if (q.action === "add") {
        charData.quests = charData.quests || [];
        charData.quests.push(q.quest);
        HUD.toast(`📜 New Quest: ${q.quest}`, "#ffd700");
      }
    }

    // Process NPCs
    for (const npc of blocks.npcs || []) {
      NPCs.add(npc.name, { race: npc.race, role: npc.role, disposition: npc.disposition });
    }

    // Process lore
    for (const lore of blocks.loreEntries || []) {
      Journal.add(lore.title, lore.category, lore.text);
    }
  }

  return {
    isOpen, show, close, update, selectChoice, showAIDialogue, isPending: () => aiPending,
    isActive: isOpen,
    draw: () => {}, // Dialogue renders via DOM, not canvas
  };
})();
