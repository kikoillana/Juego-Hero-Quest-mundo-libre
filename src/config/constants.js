/**
 * @fileoverview Constantes globales, métricas 2.5D, tipos de terreno (Mazmorra + Bosque Zelda Overworld),
 * zonas del Mundo Libre, estados y paleta cromática HeroQuest.
 * Capa 0: Sin dependencias externas.
 */

export const TILE = 48;
export const WALL_H = 34;
export const GRAVITY = 1200;

export const BOARD_COLS = 34;
export const BOARD_ROWS = 26;

// Mapa del Bosque Exterior multiplicado x4 en superficie (104x76 = 7.904 celdas vs 52x38 = 1.976 celdas)
export const OVERWORLD_COLS = 104;
export const OVERWORLD_ROWS = 76;

export const LOS_RADIUS = 8.5; // Radio de visión en celdas (en mazmorras)
export const OVERWORLD_LOS_RADIUS = 22.0; // Visión amplia a plena luz del bosque

export const FOG = Object.freeze({
    UNSEEN: 0,
    EXPLORED: 1,
    VISIBLE: 2
});

export const CELL = Object.freeze({
    VOID: 0,
    FLOOR: 1,
    WALL: 2,
    CORRIDOR: 3,
    STAIRS: 4,
    // Celdas del Bosque Exterior (Mundo Libre tipo Zelda Clásico)
    GRASS: 5,
    FOREST_FLOOR: 6,
    DIRT_PATH: 7,
    WATER: 8,
    BRIDGE: 9,
    TREE: 10,
    CLIFF: 11,
    STONE_PLAZA: 12
});

export const ZONE_ID = Object.freeze({
    OVERWORLD: 'overworld',
    DUNGEON_FELLMARG: 'dungeon_fellmarg',
    DUNGEON_CRYPT: 'dungeon_crypt',
    DUNGEON_KELLAR: 'dungeon_kellar',
    DUNGEON_SWAMP: 'dungeon_swamp'
});

export const GAME_STATE = Object.freeze({
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    SHOP: 'SHOP',
    LORE: 'LORE',
    QUESTS_MODAL: 'QUESTS_MODAL',
    SAVE_MODAL: 'SAVE_MODAL',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
});

export const FURNITURE_TYPE = Object.freeze({
    // 9 Muebles Clásicos de Mazmorra HeroQuest
    TABLE: 'table',
    THRONE: 'throne',
    CHEST: 'chest',
    BOOKCASE: 'bookcase',
    RACK: 'rack',
    FIREPLACE: 'fireplace',
    ALCHEMIST_BENCH: 'alchemist_bench',
    SARCOPHAGUS: 'sarcophagus',
    WEAPONS_RACK: 'weapons_rack',
    // Jaula Rúnica de Héroe Cautivo en las Mazmorras de Rescate
    HERO_CAGE: 'hero_cage',
    // Elementos Interactuables del Bosque Exterior (Zelda Overworld x4) y Misiones Secundarias
    BUSH: 'bush',
    CAMPFIRE: 'campfire',
    ANVIL_STALL: 'anvil_stall',
    SIGNPOST: 'signpost',
    BOULDER_FIELD: 'boulder_field',
    STUMP: 'stump',
    WELL: 'well',
    QUEST_BOARD: 'quest_board',
    METEOR_NODE: 'meteor_node',
    CORRUPT_ALTAR: 'corrupt_altar',
    MOONFLOWER: 'moonflower',
    WAYSTONE: 'waystone'
});

export const TRAP_TYPE = Object.freeze({
    PIT: 'pit',
    SPEAR: 'spear',
    BOULDER: 'boulder'
});

export const LOOT_TYPE = Object.freeze({
    GOLD_COIN: 'gold_coin',
    GOLD_POUCH: 'gold_pouch',
    RUBY_GEM: 'ruby_gem',
    HEAL_POTION: 'heal_potion',
    STRENGTH_POTION: 'strength_potion',
    SPEED_POTION: 'speed_potion'
});

export const PALETTE = Object.freeze({
    VOID_BG: '#09080b',
    OVERWORLD_BG: '#0d1f12',
    CORRIDOR_A: '#2a2629',
    CORRIDOR_B: '#232023',
    WALL_TOP: '#1a171c',
    WALL_TOP_BORDER: '#3b333f',
    WALL_FRONT_UPPER: '#483f4d',
    WALL_FRONT_LOWER: '#2f2933',
    WALL_MORTAR: '#1d1920',
    // Paleta del Bosque estilo Zelda: A Link to the Past
    GRASS_A: '#2d5a27',
    GRASS_B: '#264e21',
    FOREST_FLOOR_A: '#1e3f1b',
    FOREST_FLOOR_B: '#193617',
    DIRT_A: '#855d36',
    DIRT_B: '#76512e',
    DIRT_BORDER: '#52361c',
    WATER_DEEP: '#1d4ed8',
    WATER_SHALLOW: '#2563eb',
    WATER_FOAM: '#93c5fd',
    BRIDGE_WOOD: '#78350f',
    BRIDGE_RAIL: '#451a03',
    CLIFF_TOP: '#3f4f3a',
    CLIFF_FRONT_UPPER: '#6b533b',
    CLIFF_FRONT_LOWER: '#4a3827',
    PLAZA_A: '#57534e',
    PLAZA_B: '#44403c',
    GOLD: '#f5c542',
    GOLD_DARK: '#b8860b',
    BLOOD: '#b31b1b',
    MAGIC_BLUE: '#38bdf8',
    MAGIC_PURPLE: '#c084fc',
    HEAL_GREEN: '#4ade80',
    TORCH_LIGHT: 'rgba(255, 165, 64, 0.24)',
    FOG_EXPLORED: 'rgba(10, 8, 14, 0.64)',
    FOG_UNSEEN: '#070609'
});

export const EVENTS = Object.freeze({
    // Flujo de partida
    HERO_SELECTED: 'game:hero_selected',
    GAME_START: 'game:start',
    GAME_STATE_CHANGED: 'game:state_changed',
    GAME_VICTORY: 'game:victory',
    GAME_DEFEAT: 'game:defeat',
    GAME_RESTART: 'game:restart',

    // Jugador, Grupo y Combate
    PLAYER_UPDATED: 'player:updated',
    PARTY_UPDATED: 'party:updated',
    PLAYER_ATTACK: 'player:attack',
    PLAYER_SKILL: 'player:skill',
    PLAYER_JUMP: 'player:jump',
    PLAYER_DASH: 'player:dash',
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_HEALED: 'player:healed',
    PLAYER_STEP: 'player:step',
    USE_ITEM_SLOT: 'player:use_item_slot',

    // Mundo, Transición de Zonas (Mazmorra <-> Bosque) e Interacción
    INTERACT_REQUEST: 'world:interact_request',
    ZONE_CHANGE_REQUEST: 'world:zone_change_request',
    ZONE_CHANGED: 'world:zone_changed',
    DOOR_OPENED: 'world:door_opened',
    ROOM_DISCOVERED: 'world:room_discovered',
    FURNITURE_INSPECTED: 'world:furniture_inspected',
    CHEST_OPENED: 'world:chest_opened',
    BUSH_CUT: 'world:bush_cut',
    CAMPFIRE_REST: 'world:campfire_rest',
    TRAP_TRIGGERED: 'world:trap_triggered',
    TRAP_DISARMED: 'world:trap_disarmed',
    SPAWN_LOOT: 'world:spawn_loot',
    LOOT_COLLECTED: 'world:loot_collected',

    // Monstruos
    MONSTER_ALERTED: 'monster:alerted',
    MONSTER_GROWL: 'monster:growl',
    MONSTER_TELEGRAPH: 'monster:telegraph',
    MONSTER_ATTACK: 'monster:attack',
    MONSTER_DAMAGED: 'monster:damaged',
    MONSTER_KILLED: 'monster:killed',
    BOSS_DEFEATED: 'monster:boss_defeated',
    BOSS_SUMMON: 'monster:boss_summon',
    COMBAT_STATE_CHANGED: 'combat:state_changed',

    // Efectos Visuales y Cámara
    CAMERA_SHAKE: 'camera:shake',
    PARTICLE_BURST: 'fx:particle_burst',
    FLOATING_TEXT: 'fx:floating_text',
    SLASH_FX: 'fx:slash',
    MAGIC_FX: 'fx:magic',

    // UI, Diálogos, Bocadillos, Tienda, Pausa y Guardado BBDD
    DIALOG_SHOW: 'ui:dialog_show',
    DIALOG_HIDE: 'ui:dialog_hide',
    BUBBLE_SHOW: 'ui:bubble_show',
    TOGGLE_PAUSE: 'ui:toggle_pause',
    TOGGLE_SHOP: 'ui:toggle_shop',
    TOGGLE_LORE: 'ui:toggle_lore',
    TOGGLE_SAVE_MODAL: 'ui:toggle_save_modal',
    SHOP_PURCHASE: 'ui:shop_purchase',
    QUICK_SAVE: 'game:quick_save',
    QUICK_LOAD: 'game:quick_load',
    GAME_SAVED: 'game:saved',
    GAME_LOADED: 'game:loaded',

    // Audio & Voz
    SFX_PLAY: 'audio:sfx_play',
    MUSIC_TOGGLE: 'audio:music_toggle',
    MUSIC_STATE: 'audio:music_state',
    VOICE_TOGGLE: 'audio:voice_toggle',
    VOICE_SPEAK: 'audio:voice_speak',
    VOICE_STATE: 'audio:voice_state',

    // Rescate de Héroes, Misiones Secundarias y Segunda Habilidad Activa
    HERO_RESCUED: 'party:hero_rescued',
    PLAYER_SECOND_SKILL: 'player:second_skill',
    NPC_INTERACT: 'world:npc_interact',
    METEOR_COLLECTED: 'quest:meteor_collected',
    ALTAR_PURIFIED: 'quest:altar_purified',
    MOONFLOWER_PICKED: 'quest:moonflower_picked',
    SUBBOSS_KILLED: 'quest:subboss_killed',
    QUEST_UPDATED: 'quest:updated',
    QUEST_COMPLETED: 'quest:completed',
    TOGGLE_QUESTS: 'ui:toggle_quests'
});
