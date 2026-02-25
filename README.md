# Old Greg's Tavern 🍺⚔️

An AI-powered, D&D-lite text RPG — playable solo or with friends. Old Greg is your Game Master, generating campaigns on the fly using AI.

## Features

- 🍺 **Old Greg** — AI Game Master with personality, dark humour, and vivid narration
- 🛡️ **Character creation** — 6 races with racial stat bonuses, 6 classes
- 🎲 **Real dice mechanics** — d20 attack rolls vs AC, crits on nat 20, fumbles on nat 1
- ⚔️ **Turn-based combat** — attack, defend, use skills, drink potions, or flee
- 📜 **Dynamic quests** — AI assigns and completes quests through the story
- 💰 **Loot & leveling** — gold, items, XP, and automatic level-ups
- 💀 **Death system** — Old Greg drags you back to the tavern if you fall

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- An [OpenRouter](https://openrouter.ai/) API key (free tier works)

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/old-gregs-tavern.git
cd old-gregs-tavern

# 2. Install dependencies
npm install

# 3. Set up your API key
cp .env.example .env
# Edit .env and paste your OpenRouter API key

# 4. Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

## Stack

- **Backend**: Node.js + Express (API proxy, dice rolls)
- **Frontend**: Vanilla JS, HTML5, CSS3 (no framework, no build step)
- **AI**: [OpenRouter](https://openrouter.ai/) → Google Gemini 2.0 Flash

## Project Structure

```
├── server.js          # Express server & AI proxy
├── public/
│   ├── index.html     # Game UI (Title → Character Creation → Adventure)
│   ├── css/style.css  # Dark fantasy theme
│   └── js/
│       ├── dice.js    # Dice engine & roll animations
│       ├── character.js # Character model, stats, leveling
│       ├── ai.js      # AI Game Master & response parser
│       ├── combat.js  # Turn-based combat system
│       └── game.js    # Main game controller & UI wiring
└── .env.example       # Environment variable template
```

## Contributing

PRs welcome — feature ideas, new races/classes, UI improvements, etc.

## License

MIT
