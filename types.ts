export interface Point {
  x: number;
  y: number;
}

export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
}

export enum NPCBehavior {
  WANDER,
  HUNT_FOOD,
  AVOID_DANGER,
  ATTACK_PLAYER,
}

export enum ControlMode {
  POINTER,
  TOUCH,
}

export interface Snake {
  id: number;
  name: string;
  body: Point[];
  color: string;
  speed: number;
  isPlayer: boolean;
  score: number;
  targetAngle: number;
  currentAngle: number;
  behavior?: NPCBehavior;
  behaviorTarget?: Point | null;
  lastBehaviorChange: number;
  isBoosting: boolean;
  lastBoostDropTime: number;
}

export interface Food {
  position: Point;
  color: string;
  radius: number;
  value: number;
  // For death animations
  isNew?: boolean;
  creationTime?: number;
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
}
