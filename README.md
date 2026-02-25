# 🍺 Old Greg's Tavern

**An AI-powered D&D-lite RPG text adventure.** Chat with Old Greg, the eccentric tavern-keeper and Game Master, as you explore the world of Eldermoor.

## 🎮 Play Now

**[Play on GitHub Pages →](https://schmiedey.github.io/old-gregs-tavern/)**

You'll need a free [OpenRouter](https://openrouter.ai) API key to play.

---

## ✨ Features

### 🧠 AI Game Master
- **Streaming responses** — text appears word-by-word in real-time
- **World memory** — the AI remembers NPCs, locations, and your choices
- **Model selection** — choose from Gemini, Llama, Claude, GPT-4o and more
- **Client-side rate limiting** — prevents API spam

### ⚔️ Combat System
- **Multi-enemy encounters** with individual HP bars
- **Skill system** with mana costs and cooldowns (Fireball, Sneak Attack, Heal, etc.)
- **Status effects** — Poison, Stun, Bless, Shield, Dodge, Slow, and more
- **Critical hits & misses** with visual dice rolls

### 🎭 Character System
- **6 races** — Human, Elf, Dwarf, Halfling, Orc, Tiefling
- **6 classes** — Warrior, Mage, Rogue, Cleric, Ranger, Bard
- **Unique skills per class** with 3 abilities each
- **Mana system** — manage your magical resources
- **Level-up progression** with scaling stats

### 🛒 Merchants & Economy
- **Full shop system** with weapons, armor, potions, and misc items
- **Buy and sell** with randomized stock and price variance
- **Equipment bonuses** — weapons add ATK, armor adds AC

### 🗺️ World Exploration
- **Location tracking** with a visual map
- **Connected locations** forming an explorable graph
- **AI-driven world building** — new areas appear as you explore

### 💾 Persistence
- **3 save slots** with auto-save
- **Full state persistence** — character, inventory, conversation history, map
- **Settings storage** — API key, model, sound preferences

### 🎮 Multiplayer (PeerJS)
- **Peer-to-peer** — no server needed
- **Host a game** and share a room code
- **Guests join** and share the adventure
- **Real-time sync** of narrative and actions

### 🔊 Sound Effects
- **Web Audio API** — all sounds synthesized, no audio files
- **Dice rolls, sword hits, magic, level-ups, gold, heals, death** and more
- **Ambient tavern drone** for atmosphere
- **Toggle on/off** in settings

### 🎨 Polish
- **Dark fantasy theme** with MedievalSharp typography
- **Animated dice rolls** with critical hit effects
- **Combat HP bars** for enemies
- **Mana bar, XP bar, status effects** in sidebar
- **Mobile responsive** layout
- **Typewriter streaming** for AI responses

---

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/Schmiedey/old-gregs-tavern.git
cd old-gregs-tavern

# Install
npm install

# Configure
cp .env.example .env
# Edit .env and add your OpenRouter API key

# Run
node server.js
# Open http://localhost:3000
```

### Local vs GitHub Pages

| Feature | Local (server.js) | GitHub Pages |
|---------|-------------------|--------------|
| API key | Server-side (.env) | Client-side (localStorage) |
| Streaming | Proxied through server | Direct to OpenRouter |
| Multiplayer | ✅ | ✅ |
| Sound | ✅ | ✅ |

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS (no framework, no build step)
- **AI**: OpenRouter API (Gemini, Claude, GPT-4o, Llama)
- **Multiplayer**: PeerJS (WebRTC peer-to-peer)
- **Sound**: Web Audio API (synthesized SFX)
- **Storage**: localStorage
- **Hosting**: GitHub Pages (static)
- **Server** (optional): Node.js + Express

## 📁 Structure

```
public/
├── index.html         # Main game UI
├── css/style.css      # Dark fantasy theme
├── js/
│   ├── sound.js       # Web Audio API SFX
│   ├── dice.js        # Dice engine + history
│   ├── save.js        # localStorage persistence
│   ├── map.js         # Location tracker
│   ├── character.js   # Character + skills + status
│   ├── shop.js        # Merchant system
│   ├── ai.js          # OpenRouter streaming + memory
│   ├── combat.js      # Multi-enemy combat
│   ├── multiplayer.js # PeerJS WebRTC
│   └── game.js        # Main controller
server.js              # Optional local dev server
```

## 📜 License

MIT
