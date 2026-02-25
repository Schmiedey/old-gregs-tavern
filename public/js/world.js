/* ═══════════════════════════════════════════
   world.js — World map definitions
   Each area is a tile-based room with entities
   ═══════════════════════════════════════════ */

const World = (() => {
  const MAPS = {};
  let currentMapId = "tavern";
  let visitedMaps = new Set();

  function define(id, data) { MAPS[id] = data; }

  /* ═══ TAVERN — starting area ═══ */
  define("tavern", {
    name: "Old Greg's Tavern",
    type: "tavern",
    width: 16, height: 14,
    tiles: [
      "wall,wall,wall,wall,wall,wall,wall,wall,wall,wall,wall,wall,wall,wall,wall,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,bar,bar,bar,bar,bar,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,table,chair,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,table,chair,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,table,chair,tavern_floor,tavern_floor,carpet,carpet,carpet,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,carpet,carpet,carpet,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,table,chair,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,tavern_floor,wall",
      "wall,wall,wall,wall,wall,wall,wall,door,door,wall,wall,wall,wall,wall,wall,wall",
      "void,void,void,void,void,void,void,void,void,void,void,void,void,void,void,void",
    ].map(r => r.split(",")),
    spawn: { x: 7, y: 9 },
    transitions: [
      { x: 7, y: 12, target: "town_square", spawnId: "from_tavern" },
      { x: 8, y: 12, target: "town_square", spawnId: "from_tavern" },
    ],
    npcs: [
      { name: "Old Greg", npcType: "quest", colorHue: 35, x: 3, y: 2, dialogue: "old_greg_intro" },
      { name: "Barmaid Elara", npcType: "merchant", colorHue: 330, x: 6, y: 2, dialogue: "barmaid" },
      { name: "Mysterious Stranger", npcType: "default", colorHue: 260, x: 12, y: 4, dialogue: "stranger" },
    ],
    enemies: [],
  });

  /* ═══ TOWN SQUARE ═══ */
  define("town_square", {
    name: "Town Square",
    type: "town",
    width: 24, height: 20,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 20; y++) {
        const row = [];
        for (let x = 0; x < 24; x++) {
          if (y === 0 || y === 19 || x === 0 || x === 23) {
            if (y === 0 && x >= 10 && x <= 12) row.push("path"); // north exit
            else if (y === 19 && x >= 10 && x <= 12) row.push("path"); // south exit
            else if (x === 0 && y >= 9 && y <= 11) row.push("path"); // west exit
            else if (x === 23 && y >= 9 && y <= 11) row.push("path"); // east exit
            else row.push("tree");
          } else if (y >= 8 && y <= 12 && x >= 9 && x <= 14) {
            row.push("stone"); // center plaza
          } else if ((y === 8 || y === 12) && x >= 8 && x <= 15) {
            row.push("stone");
          } else if (x >= 9 && x <= 14 && (y === 7 || y === 13)) {
            row.push("path");
          } else if (y >= 1 && y <= 3 && x >= 8 && x <= 14) {
            if (y === 1) row.push("wall");
            else if (y === 2 && (x === 8 || x === 14)) row.push("wall");
            else if (y === 2) row.push("tavern_floor");
            else if (y === 3 && x === 11) row.push("door");
            else if (y === 3) row.push("wall");
            else row.push("grass");
          } else {
            const r = Math.random();
            if (r < 0.1) row.push("grass2");
            else if (r < 0.15) row.push("dirt");
            else row.push("grass");
          }
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 11, y: 5 },
    spawns: { from_tavern: { x: 11, y: 5 }, from_forest: { x: 22, y: 10 }, from_road: { x: 11, y: 18 }, from_west: { x: 1, y: 10 }, from_north: { x: 11, y: 1 } },
    transitions: [
      { x: 11, y: 3, target: "tavern", spawnId: "default" },
      { x: 23, y: 9, target: "forest_edge", spawnId: "from_town" },
      { x: 23, y: 10, target: "forest_edge", spawnId: "from_town" },
      { x: 23, y: 11, target: "forest_edge", spawnId: "from_town" },
      { x: 11, y: 19, target: "south_road", spawnId: "from_town" },
      { x: 10, y: 19, target: "south_road", spawnId: "from_town" },
      { x: 12, y: 19, target: "south_road", spawnId: "from_town" },
      { x: 0, y: 9, target: "west_path", spawnId: "from_town" },
      { x: 0, y: 10, target: "west_path", spawnId: "from_town" },
      { x: 0, y: 11, target: "west_path", spawnId: "from_town" },
      { x: 10, y: 0, target: "north_gate", spawnId: "from_town" },
      { x: 11, y: 0, target: "north_gate", spawnId: "from_town" },
      { x: 12, y: 0, target: "north_gate", spawnId: "from_town" },
    ],
    npcs: [
      { name: "Guard Captain", npcType: "quest", colorHue: 20, x: 10, y: 10, dialogue: "guard_captain" },
      { name: "Merchant Tomas", npcType: "merchant", colorHue: 45, x: 14, y: 9, dialogue: "merchant" },
      { name: "Villager", npcType: "default", colorHue: 120, x: 5, y: 7, dialogue: "villager" },
    ],
    enemies: [],
  });

  /* ═══ FOREST EDGE ═══ */
  define("forest_edge", {
    name: "Forest Edge",
    type: "wilderness",
    width: 20, height: 16,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 16; y++) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          if (x === 0 && y >= 6 && y <= 8) row.push("path");
          else if (x === 19 && y >= 6 && y <= 8) row.push("path");
          else if (y === 15 && x >= 9 && x <= 11) row.push("path");
          else if (x === 0 || x === 19 || y === 0 || y === 15) row.push("tree");
          else if (y >= 6 && y <= 8 && x >= 1 && x <= 18) row.push("path");
          else if (Math.random() < 0.25) row.push("tree");
          else if (Math.random() < 0.1) row.push("bush");
          else if (Math.random() < 0.15) row.push("grass2");
          else row.push("grass");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 2, y: 7 },
    spawns: { from_town: { x: 1, y: 7 }, from_deep: { x: 18, y: 7 }, from_cave: { x: 10, y: 14 } },
    transitions: [
      { x: 0, y: 6, target: "town_square", spawnId: "from_forest" },
      { x: 0, y: 7, target: "town_square", spawnId: "from_forest" },
      { x: 0, y: 8, target: "town_square", spawnId: "from_forest" },
      { x: 19, y: 6, target: "deep_forest", spawnId: "from_edge" },
      { x: 19, y: 7, target: "deep_forest", spawnId: "from_edge" },
      { x: 19, y: 8, target: "deep_forest", spawnId: "from_edge" },
      { x: 9, y: 15, target: "cave_entrance", spawnId: "from_forest" },
      { x: 10, y: 15, target: "cave_entrance", spawnId: "from_forest" },
      { x: 11, y: 15, target: "cave_entrance", spawnId: "from_forest" },
    ],
    npcs: [],
    enemies: [
      { name: "Forest Rat", enemyType: "rat", x: 8, y: 4, hp: 8, maxHp: 8, atk: 1, ac: 8, xp: 5, speed: 1.2, gold: 2 },
      { name: "Forest Rat", enemyType: "rat", x: 14, y: 11, hp: 8, maxHp: 8, atk: 1, ac: 8, xp: 5, speed: 1.2, gold: 2 },
      { name: "Wolf", enemyType: "wolf", x: 16, y: 3, hp: 15, maxHp: 15, atk: 3, ac: 10, xp: 15, speed: 1.5, gold: 5 },
    ],
  });

  /* ═══ DEEP FOREST ═══ */
  define("deep_forest", {
    name: "Deep Forest",
    type: "wilderness",
    width: 22, height: 18,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 18; y++) {
        const row = [];
        for (let x = 0; x < 22; x++) {
          if (x === 0 && y >= 7 && y <= 9) row.push("path");
          else if (x === 0 || x === 21 || y === 0 || y === 17) row.push("tree");
          else if (y >= 7 && y <= 9 && x <= 10) row.push("path");
          else if (Math.random() < 0.3) row.push("tree");
          else if (Math.random() < 0.15) row.push("bush");
          else row.push("grass");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 1, y: 8 },
    spawns: { from_edge: { x: 1, y: 8 } },
    transitions: [
      { x: 0, y: 7, target: "forest_edge", spawnId: "from_deep" },
      { x: 0, y: 8, target: "forest_edge", spawnId: "from_deep" },
      { x: 0, y: 9, target: "forest_edge", spawnId: "from_deep" },
    ],
    npcs: [
      { name: "Forest Hermit", npcType: "quest", colorHue: 100, x: 15, y: 5, dialogue: "hermit" },
    ],
    enemies: [
      { name: "Wolf", enemyType: "wolf", x: 6, y: 4, hp: 15, maxHp: 15, atk: 3, ac: 10, xp: 15, speed: 1.5, gold: 5 },
      { name: "Goblin Scout", enemyType: "goblin", x: 12, y: 12, hp: 18, maxHp: 18, atk: 4, ac: 12, xp: 20, speed: 1.0, gold: 10 },
      { name: "Giant Spider", enemyType: "spider", x: 18, y: 8, hp: 22, maxHp: 22, atk: 5, ac: 11, xp: 25, speed: 1.3, gold: 8 },
    ],
  });

  /* ═══ CAVE ENTRANCE ═══ */
  define("cave_entrance", {
    name: "Cave Entrance",
    type: "cave",
    width: 16, height: 16,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 16; y++) {
        const row = [];
        for (let x = 0; x < 16; x++) {
          if (y <= 2 && x >= 6 && x <= 9) row.push("path");
          else if (x === 0 || x === 15 || y === 0 || y === 15) row.push("wall_dark");
          else if (y === 15 && x >= 7 && x <= 8) row.push("stairs_down");
          else if (Math.random() < 0.15) row.push("wall_dark");
          else row.push("stone");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 7, y: 1 },
    spawns: { from_forest: { x: 7, y: 1 }, from_dungeon: { x: 7, y: 14 } },
    transitions: [
      { x: 6, y: 0, target: "forest_edge", spawnId: "from_cave" },
      { x: 7, y: 0, target: "forest_edge", spawnId: "from_cave" },
      { x: 8, y: 0, target: "forest_edge", spawnId: "from_cave" },
      { x: 9, y: 0, target: "forest_edge", spawnId: "from_cave" },
      { x: 7, y: 15, target: "dungeon_f1", spawnId: "from_cave" },
      { x: 8, y: 15, target: "dungeon_f1", spawnId: "from_cave" },
    ],
    npcs: [],
    enemies: [
      { name: "Cave Bat", enemyType: "bat", x: 5, y: 8, hp: 6, maxHp: 6, atk: 2, ac: 13, xp: 8, speed: 1.8, gold: 1 },
      { name: "Cave Bat", enemyType: "bat", x: 11, y: 6, hp: 6, maxHp: 6, atk: 2, ac: 13, xp: 8, speed: 1.8, gold: 1 },
      { name: "Slime", enemyType: "slime", x: 8, y: 12, hp: 12, maxHp: 12, atk: 2, ac: 7, xp: 10, speed: 0.6, gold: 3 },
    ],
  });

  /* ═══ DUNGEON FLOOR 1 ═══ */
  define("dungeon_f1", {
    name: "Dungeon — Floor 1",
    type: "dungeon",
    width: 20, height: 18,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 18; y++) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          if (x === 0 || x === 19 || y === 0 || y === 17) row.push("wall_dark");
          else if (y <= 2 && x >= 9 && x <= 10) row.push("stairs_up");
          else if (y >= 15 && x >= 9 && x <= 10) row.push("stairs_down");
          else if ((x === 5 || x === 14) && y >= 4 && y <= 8) row.push("wall_dark");
          else if (y === 10 && (x <= 6 || x >= 13)) row.push("wall_dark");
          else if (Math.random() < 0.05) row.push("wall_dark");
          else row.push("stone");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 9, y: 2 },
    spawns: { from_cave: { x: 9, y: 2 } },
    transitions: [
      { x: 9, y: 0, target: "cave_entrance", spawnId: "from_dungeon" },
      { x: 10, y: 0, target: "cave_entrance", spawnId: "from_dungeon" },
    ],
    npcs: [],
    enemies: [
      { name: "Skeleton", enemyType: "skeleton", x: 4, y: 6, hp: 20, maxHp: 20, atk: 5, ac: 12, xp: 25, speed: 0.8, gold: 12 },
      { name: "Goblin", enemyType: "goblin", x: 15, y: 5, hp: 18, maxHp: 18, atk: 4, ac: 12, xp: 20, speed: 1.0, gold: 10 },
      { name: "Slime", enemyType: "slime", x: 10, y: 13, hp: 12, maxHp: 12, atk: 2, ac: 7, xp: 10, speed: 0.6, gold: 3 },
      { name: "Skeleton Guard", enemyType: "skeleton", x: 9, y: 15, hp: 25, maxHp: 25, atk: 6, ac: 14, xp: 35, speed: 0.9, gold: 18 },
    ],
  });

  /* ═══ SOUTH ROAD ═══ */
  define("south_road", {
    name: "South Road",
    type: "road",
    width: 18, height: 14,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 14; y++) {
        const row = [];
        for (let x = 0; x < 18; x++) {
          if (y === 0 && x >= 7 && x <= 9) row.push("path");
          else if (x === 0 || x === 17 || y === 0 || y === 13) row.push("tree");
          else if (x >= 7 && x <= 9) row.push("path");
          else if (Math.random() < 0.2) row.push("tree");
          else row.push("grass");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 8, y: 1 },
    spawns: { from_town: { x: 8, y: 1 } },
    transitions: [
      { x: 7, y: 0, target: "town_square", spawnId: "from_road" },
      { x: 8, y: 0, target: "town_square", spawnId: "from_road" },
      { x: 9, y: 0, target: "town_square", spawnId: "from_road" },
    ],
    npcs: [
      { name: "Wandering Merchant", npcType: "merchant", colorHue: 40, x: 5, y: 8, dialogue: "wandering_merchant" },
    ],
    enemies: [
      { name: "Bandit", enemyType: "bandit", x: 13, y: 5, hp: 18, maxHp: 18, atk: 4, ac: 11, xp: 20, speed: 1.1, gold: 15 },
      { name: "Wolf", enemyType: "wolf", x: 3, y: 10, hp: 15, maxHp: 15, atk: 3, ac: 10, xp: 15, speed: 1.5, gold: 5 },
    ],
  });

  /* ═══ WEST PATH ═══ */
  define("west_path", {
    name: "Western Path",
    type: "wilderness",
    width: 18, height: 14,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 14; y++) {
        const row = [];
        for (let x = 0; x < 18; x++) {
          if (x === 17 && y >= 5 && y <= 7) row.push("path");
          else if (x === 0 || x === 17 || y === 0 || y === 13) row.push("tree");
          else if (y >= 5 && y <= 7) row.push("path");
          else if (Math.random() < 0.2) row.push("tree");
          else if (Math.random() < 0.1) row.push("bush");
          else row.push("grass");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 16, y: 6 },
    spawns: { from_town: { x: 16, y: 6 } },
    transitions: [
      { x: 17, y: 5, target: "town_square", spawnId: "from_west" },
      { x: 17, y: 6, target: "town_square", spawnId: "from_west" },
      { x: 17, y: 7, target: "town_square", spawnId: "from_west" },
    ],
    npcs: [],
    enemies: [
      { name: "Forest Rat", enemyType: "rat", x: 5, y: 3, hp: 8, maxHp: 8, atk: 1, ac: 8, xp: 5, speed: 1.2, gold: 2 },
      { name: "Goblin", enemyType: "goblin", x: 8, y: 10, hp: 18, maxHp: 18, atk: 4, ac: 12, xp: 20, speed: 1.0, gold: 10 },
    ],
  });

  /* ═══ NORTH GATE ═══ */
  define("north_gate", {
    name: "North Gate",
    type: "town",
    width: 18, height: 14,
    tiles: (() => {
      const m = [];
      for (let y = 0; y < 14; y++) {
        const row = [];
        for (let x = 0; x < 18; x++) {
          if (y === 13 && x >= 7 && x <= 9) row.push("path");
          else if (x === 0 || x === 17 || y === 13) row.push("wall");
          else if (y === 0) row.push("tree");
          else if (x >= 7 && x <= 9) row.push("stone");
          else if (y >= 5 && y <= 7 && (x >= 2 && x <= 5)) row.push("stone");
          else if (y >= 5 && y <= 7 && (x >= 12 && x <= 15)) row.push("stone");
          else row.push("grass");
        }
        m.push(row);
      }
      return m;
    })(),
    spawn: { x: 8, y: 12 },
    spawns: { from_town: { x: 8, y: 12 } },
    transitions: [
      { x: 7, y: 13, target: "town_square", spawnId: "from_north" },
      { x: 8, y: 13, target: "town_square", spawnId: "from_north" },
      { x: 9, y: 13, target: "town_square", spawnId: "from_north" },
    ],
    npcs: [
      { name: "Gate Guard", npcType: "default", colorHue: 10, x: 6, y: 6, dialogue: "gate_guard" },
    ],
    enemies: [],
  });

  /* ═══ MAP LOADING ═══ */
  function loadMap(mapId, spawnId) {
    const data = MAPS[mapId];
    if (!data) { console.error("Map not found:", mapId); return; }

    currentMapId = mapId;
    visitedMaps.add(mapId);

    TileMap.load(data);

    // Determine spawn point
    let spawn = data.spawn;
    if (spawnId && data.spawns && data.spawns[spawnId]) {
      spawn = data.spawns[spawnId];
    }

    // Clear and populate entities
    Entities.clear();

    // Add NPCs
    for (const npc of (data.npcs || [])) {
      Entities.add({
        kind: "npc",
        name: npc.name,
        npcType: npc.npcType || "default",
        colorHue: npc.colorHue || 200,
        x: npc.x * Sprites.TILE,
        y: npc.y * Sprites.TILE,
        spawnX: npc.x * Sprites.TILE,
        spawnY: npc.y * Sprites.TILE,
        dialogue: npc.dialogue,
      });
    }

    // Add enemies (respawn if not killed in this session)
    for (const enemy of (data.enemies || [])) {
      Entities.add({
        kind: "enemy",
        name: enemy.name,
        enemyType: enemy.enemyType || "goblin",
        x: enemy.x * Sprites.TILE,
        y: enemy.y * Sprites.TILE,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        atk: enemy.atk,
        ac: enemy.ac || 10,
        xp: enemy.xp || 10,
        speed: enemy.speed || 1,
        gold: enemy.gold || 5,
        active: true,
        attackCooldown: 0,
        statusEffects: [],
      });
    }

    return spawn;
  }

  function getCurrentId() { return currentMapId; }
  function getCurrentName() { return MAPS[currentMapId]?.name || "Unknown"; }
  function getCurrentType() { return MAPS[currentMapId]?.type || "unknown"; }
  function getVisited() { return [...visitedMaps]; }
  function setVisited(arr) { visitedMaps = new Set(arr || []); }
  function getAllMapNames() {
    return Object.entries(MAPS).map(([id, m]) => ({ id, name: m.name, type: m.type }));
  }
  function getMapData(id) { return MAPS[id]; }

  return {
    loadMap, getCurrentId, getCurrentName, getCurrentType,
    getVisited, setVisited, getAllMapNames, getMapData, define, MAPS,
  };
})();
