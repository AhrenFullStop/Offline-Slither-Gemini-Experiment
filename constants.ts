import { Point } from './types';

export const MAP_WIDTH = 5000;
export const MAP_HEIGHT = 5000;

export const NUM_INITIAL_NPCS = 30; // Increased from 25
export const NUM_INITIAL_FOOD = 750;

export const SNAKE_INITIAL_LENGTH = 15;
export const SNAKE_TURN_SPEED = 0.075;
export const SNAKE_BASE_SPEED = 2.5;
export const SNAKE_BOOST_SPEED_MULTIPLIER = 2;
export const BOOST_DROP_INTERVAL = 100; // ms
export const BOOST_FOOD_VALUE = 2; // score cost per dropped food pellet
export const SNAKE_BODY_DISTANCE = 6;
export const SNAKE_HEAD_RADIUS = 8;
export const SNAKE_BODY_RADIUS_MULTIPLIER = 0.8;
export const SNAKE_SCORE_TO_RADIUS_RATIO = 0.05;

export const FOOD_RADIUS_MIN = 3;
export const FOOD_RADIUS_MAX = 7;
export const FOOD_VALUE_MULTIPLIER = 0.2;
export const FOOD_DROP_ON_DEATH_FACTOR = 0.5;
export const FOOD_DROP_CHUNK_SIZE = 5; // Drop a valuable food chunk every 5 body segments on death

export const NPC_BEHAVIOR_CHANGE_INTERVAL = 3000; // ms, reduced for quicker decisions
export const NPC_VIEW_DISTANCE = 500;
export const NPC_DANGER_AVOID_DISTANCE = 200;

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.1;

export const LEADERBOARD_MAX_ENTRIES = 10;
export const PLAYER_NAME = "You";

export const NPC_NAMES = [
  "Viper", "Slitherin", "Noodle", "Boa", "Cobra", "Python",
  "Mamba", "Asp", "Jormun", "Basilisk", "Naga", "Wyrm",
  "Orochi", "Quetzal", "Hydra", "Leviathan", "Ekans",
  "Serpent", "Coil", "Hisser", "Zilla", "Slink", "Wriggler"
];