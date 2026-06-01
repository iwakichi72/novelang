export type Direction = "up" | "down" | "left" | "right";
export type Point = { x: number; y: number };
export type GameMode = "ready" | "running" | "paused" | "gameover";

export type GameState = {
  mode: GameMode;
  grid: { cols: number; rows: number };
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point;
  score: number;
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DIRECTIONS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createInitialState(
  cols = 20,
  rows = 20,
  rng: () => number = Math.random
): GameState {
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);
  const snake: Point[] = [
    { x: centerX + 1, y: centerY },
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
  ];
  const food = placeFood({ cols, rows }, snake, rng) ?? { x: 0, y: 0 };

  return {
    mode: "ready",
    grid: { cols, rows },
    snake,
    direction: "right",
    nextDirection: "right",
    food,
    score: 0,
  };
}

export function setNextDirection(
  state: GameState,
  direction: Direction
): GameState {
  if (OPPOSITE[state.direction] === direction) {
    return state;
  }
  return { ...state, nextDirection: direction };
}

export function stepGame(
  state: GameState,
  rng: () => number = Math.random
): GameState {
  if (state.mode !== "running") {
    return state;
  }

  const direction = state.nextDirection;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.grid.cols ||
    nextHead.y >= state.grid.rows;
  const hitSelf = state.snake.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y
  );

  if (hitWall || hitSelf) {
    return { ...state, mode: "gameover" };
  }

  const ateFood =
    nextHead.x === state.food.x && nextHead.y === state.food.y;
  const nextSnake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  let nextFood = state.food;
  let nextMode: GameMode = state.mode;

  if (ateFood) {
    const placed = placeFood(state.grid, nextSnake, rng);
    if (placed) {
      nextFood = placed;
    } else {
      nextMode = "gameover";
    }
  }

  return {
    ...state,
    mode: nextMode,
    direction,
    snake: nextSnake,
    food: nextFood,
    score: state.score + (ateFood ? 1 : 0),
  };
}

export function placeFood(
  grid: { cols: number; rows: number },
  snake: Point[],
  rng: () => number = Math.random
): Point | null {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const candidates: Point[] = [];

  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const index = Math.floor(rng() * candidates.length);
  return candidates[index];
}
