import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Point, Snake, Food, NPCBehavior, ControlMode } from '../types';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  NUM_INITIAL_NPCS,
  NUM_INITIAL_FOOD,
  SNAKE_INITIAL_LENGTH,
  SNAKE_TURN_SPEED,
  SNAKE_BASE_SPEED,
  SNAKE_BODY_DISTANCE,
  SNAKE_HEAD_RADIUS,
  SNAKE_BODY_RADIUS_MULTIPLIER,
  SNAKE_SCORE_TO_RADIUS_RATIO,
  FOOD_RADIUS_MIN,
  FOOD_RADIUS_MAX,
  FOOD_VALUE_MULTIPLIER,
  FOOD_DROP_ON_DEATH_FACTOR,
  FOOD_DROP_CHUNK_SIZE,
  NPC_BEHAVIOR_CHANGE_INTERVAL,
  NPC_VIEW_DISTANCE,
  NPC_DANGER_AVOID_DISTANCE,
  SNAKE_BOOST_SPEED_MULTIPLIER,
  BOOST_DROP_INTERVAL,
  BOOST_FOOD_VALUE,
  NPC_NAMES,
  PLAYER_NAME
} from '../constants';

interface GameCanvasProps {
  setScore: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onSnakesUpdate: (snakes: Snake[]) => void;
  zoomLevel: number;
  controlMode: ControlMode;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ setScore, onGameOver, onSnakesUpdate, zoomLevel, controlMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);

  const gameStateRef = useRef({
    player: null as Snake | null,
    snakes: [] as Snake[],
    food: [] as Food[],
    stars: {
      near: [] as Point[],
      mid: [] as Point[],
      far: [] as Point[]
    },
    mousePos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    camera: { x: 0, y: 0 },
    lastUpdateTime: performance.now(),
    joystick: {
      active: false,
      touchId: null as number | null,
      base: { x: 0, y: 0 },
      knob: { x: 0, y: 0 },
      baseRadius: 60,
      knobRadius: 25,
    }
  });

  const getRandomColor = () => `hsl(${Math.random() * 360}, 100%, 70%)`;
  const getRandomPosition = (): Point => ({ x: Math.random() * MAP_WIDTH, y: Math.random() * MAP_HEIGHT });
  const distSq = (p1: Point, p2: Point) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

  const createSnake = useCallback((isPlayer: boolean, id: number): Snake => {
    const startPos = getRandomPosition();
    const body: Point[] = [];
    for (let i = 0; i < SNAKE_INITIAL_LENGTH; i++) {
      body.push({ x: startPos.x - i * SNAKE_BODY_DISTANCE, y: startPos.y });
    }
    const behavior = isPlayer ? undefined : Object.values(NPCBehavior)[Math.floor(Math.random() * 4)] as NPCBehavior;

    return {
      id,
      name: isPlayer ? PLAYER_NAME : NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)],
      body,
      color: getRandomColor(),
      speed: SNAKE_BASE_SPEED,
      isPlayer,
      score: SNAKE_INITIAL_LENGTH,
      targetAngle: 0,
      currentAngle: 0,
      behavior,
      behaviorTarget: null,
      lastBehaviorChange: Date.now(),
      isBoosting: false,
      lastBoostDropTime: 0,
    };
  }, []);
  
  const createFood = useCallback((position?: Point): Food => {
    const radius = Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN) + FOOD_RADIUS_MIN;
    return {
      position: position || getRandomPosition(),
      color: getRandomColor(),
      radius,
      value: Math.round(radius * FOOD_VALUE_MULTIPLIER) + 1,
    };
  }, []);

  const initializeGame = useCallback(() => {
    const player = createSnake(true, 0);
    gameStateRef.current.player = player;
    gameStateRef.current.snakes = [player];
    gameStateRef.current.food = [];

    for (let i = 0; i < NUM_INITIAL_NPCS; i++) {
      gameStateRef.current.snakes.push(createSnake(false, i + 1));
    }

    for (let i = 0; i < NUM_INITIAL_FOOD; i++) {
      gameStateRef.current.food.push(createFood());
    }

    // Initialize parallax stars
    for(let i=0; i < 100; i++) gameStateRef.current.stars.far.push(getRandomPosition());
    for(let i=0; i < 100; i++) gameStateRef.current.stars.mid.push(getRandomPosition());
    for(let i=0; i < 100; i++) gameStateRef.current.stars.near.push(getRandomPosition());

  }, [createSnake, createFood]);

  const updateNpcBehavior = (npc: Snake) => {
    const now = Date.now();
    const { player } = gameStateRef.current;
  
    // High-priority: Avoid immediate danger
    for (const other of gameStateRef.current.snakes) {
      if (other.id === npc.id) continue;
      
      const head = npc.body[0];
      const futureHead: Point = {
          x: head.x + Math.cos(npc.currentAngle) * NPC_DANGER_AVOID_DISTANCE,
          y: head.y + Math.sin(npc.currentAngle) * NPC_DANGER_AVOID_DISTANCE,
      };

      for(const segment of other.body) {
          if (distSq(futureHead, segment) < (NPC_DANGER_AVOID_DISTANCE * 0.75) ** 2) {
            npc.behavior = NPCBehavior.AVOID_DANGER;
            const angleToDanger = Math.atan2(segment.y - head.y, segment.x - head.x);
            npc.targetAngle = angleToDanger + Math.PI * (Math.random() > 0.5 ? 0.5 : -0.5);
            return;
          }
      }
    }
  
    if (now - npc.lastBehaviorChange > NPC_BEHAVIOR_CHANGE_INTERVAL || !npc.behaviorTarget) {
      npc.lastBehaviorChange = now;
      npc.behaviorTarget = null;
      
      const rand = Math.random();
      if (npc.score < 100 || rand < 0.6) {
          npc.behavior = NPCBehavior.HUNT_FOOD;
      } else if (rand < 0.85 && player && player.score < npc.score * 1.5) {
          npc.behavior = NPCBehavior.ATTACK_PLAYER;
      } else {
          npc.behavior = NPCBehavior.WANDER;
      }
    }
  
    switch (npc.behavior) {
      case NPCBehavior.ATTACK_PLAYER:
        if (player) {
          npc.behaviorTarget = player.body[0];
        }
        break;
      case NPCBehavior.HUNT_FOOD:
        if (!npc.behaviorTarget || Math.random() < 0.1) {
          let closestFood: Food | null = null;
          let minDistsq = NPC_VIEW_DISTANCE ** 2;
          for (const f of gameStateRef.current.food) {
            const d = distSq(npc.body[0], f.position);
            if (d < minDistsq) {
              minDistsq = d;
              closestFood = f;
            }
          }
          npc.behaviorTarget = closestFood?.position || null;
        }
        break;
      case NPCBehavior.WANDER:
      default:
        if (!npc.behaviorTarget || distSq(npc.body[0], npc.behaviorTarget) < 100 ** 2) {
          npc.behaviorTarget = {
            x: npc.body[0].x + (Math.random() - 0.5) * 1000,
            y: npc.body[0].y + (Math.random() - 0.5) * 1000,
          };
        }
        break;
    }
  
    if (npc.behaviorTarget) {
      npc.targetAngle = Math.atan2(npc.behaviorTarget.y - npc.body[0].y, npc.behaviorTarget.x - npc.body[0].x);
    }
  };

  const update = (deltaTime: number) => {
    const { player, snakes, mousePos, joystick } = gameStateRef.current;
    if (!player) return;

    const now = performance.now();

    if (controlMode === ControlMode.POINTER) {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const screenPlayerHead = { x: rect.width / 2, y: rect.height / 2 };
            player.targetAngle = Math.atan2(mousePos.y - screenPlayerHead.y, mousePos.x - screenPlayerHead.x);
        }
    } else if (controlMode === ControlMode.TOUCH && joystick.active) {
        const angle = Math.atan2(joystick.knob.y - joystick.base.y, joystick.knob.x - joystick.base.x);
        player.targetAngle = angle;
    }


    snakes.forEach(snake => {
        if (!snake.isPlayer) {
            updateNpcBehavior(snake);
        }

        if (snake.isBoosting && snake.score > SNAKE_INITIAL_LENGTH + BOOST_FOOD_VALUE) {
            if (now - snake.lastBoostDropTime > BOOST_DROP_INTERVAL) {
                const tail = snake.body[snake.body.length - 1];
                if (tail) {
                    snake.score -= BOOST_FOOD_VALUE;
                    const droppedFood = createFood({ ...tail });
                    droppedFood.value = BOOST_FOOD_VALUE;
                    droppedFood.color = snake.color;
                    gameStateRef.current.food.push(droppedFood);
                    snake.lastBoostDropTime = now;
                }
            }
        }

        let angleDiff = snake.targetAngle - snake.currentAngle;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        snake.currentAngle += angleDiff * SNAKE_TURN_SPEED * (deltaTime / 16);
        
        const speed = snake.speed * (snake.isBoosting ? SNAKE_BOOST_SPEED_MULTIPLIER : 1);
        const newHead: Point = {
            x: snake.body[0].x + Math.cos(snake.currentAngle) * speed * (deltaTime / 16),
            y: snake.body[0].y + Math.sin(snake.currentAngle) * speed * (deltaTime / 16),
        };

        if (newHead.x < 0 || newHead.x > MAP_WIDTH || newHead.y < 0 || newHead.y > MAP_HEIGHT) {
            handleSnakeDeath(snake);
            return;
        }

        snake.body.unshift(newHead);
        
        let totalDistance = 0;
        for (let i = 0; i < snake.body.length - 1; i++) {
            totalDistance += Math.sqrt(distSq(snake.body[i], snake.body[i + 1]));
        }

        const maxBodySegments = Math.floor(snake.score);
        while(snake.body.length > maxBodySegments || snake.body.length > 2 && totalDistance > snake.score * SNAKE_BODY_DISTANCE) {
            if (snake.body.length <= 2) break;
            snake.body.pop();
            totalDistance = 0;
            for (let i = 0; i < snake.body.length - 1; i++) {
                totalDistance += Math.sqrt(distSq(snake.body[i], snake.body[i+1]));
            }
        }
    });

    const eatenFoodIndices = new Set<number>();
    for (const snake of snakes) {
        if (!snake.body.length) continue;
        const head = snake.body[0];
        const headRadius = SNAKE_HEAD_RADIUS + snake.score * SNAKE_SCORE_TO_RADIUS_RATIO;

        gameStateRef.current.food.forEach((f, index) => {
            if (eatenFoodIndices.has(index)) return;
            if (distSq(head, f.position) < (headRadius + f.radius)**2) {
                snake.score += f.value;
                eatenFoodIndices.add(index);
            }
        });
    }
    if (eatenFoodIndices.size > 0) {
        gameStateRef.current.food = gameStateRef.current.food.filter((_, index) => !eatenFoodIndices.has(index));
    }

    const snakesToCheck = [...snakes];
    for(const snake of snakesToCheck) {
        if (!snake.body.length) continue;
        const head = snake.body[0];
        const headRadius = SNAKE_HEAD_RADIUS + snake.score * SNAKE_SCORE_TO_RADIUS_RATIO;
        
        for(const otherSnake of snakes) {
            if (snake.id === otherSnake.id) continue;
            
            const otherSnakeBaseRadius = SNAKE_HEAD_RADIUS + otherSnake.score * SNAKE_SCORE_TO_RADIUS_RATIO;
            const otherSnakeBodyRadius = otherSnakeBaseRadius * SNAKE_BODY_RADIUS_MULTIPLIER;

            for(let i = 1; i < otherSnake.body.length; i++) {
                const segment = otherSnake.body[i];
                if (distSq(head, segment) < (headRadius * 0.8 + otherSnakeBodyRadius)**2) {
                    handleSnakeDeath(snake);
                    return;
                }
            }
        }
    }
    if (player) setScore(Math.floor(player.score));
    onSnakesUpdate([...gameStateRef.current.snakes]);
  };
  
  const handleSnakeDeath = (deadSnake: Snake) => {
    const now = performance.now();
    for (let i = 0; i < deadSnake.body.length; i++) {
        if (i % FOOD_DROP_CHUNK_SIZE === 0) {
            const food = createFood(deadSnake.body[i]);
            food.value = Math.max(5, Math.floor(deadSnake.score / deadSnake.body.length * FOOD_DROP_CHUNK_SIZE * FOOD_DROP_ON_DEATH_FACTOR));
            food.color = deadSnake.color;
            food.isNew = true; // For supernova effect
            food.creationTime = now;
            gameStateRef.current.food.push(food);
        }
    }

    gameStateRef.current.snakes = gameStateRef.current.snakes.filter(s => s.id !== deadSnake.id);

    if (deadSnake.isPlayer) {
        gameStateRef.current.player = null;
        onGameOver(Math.floor(deadSnake.score));
    } else {
        setTimeout(() => {
          if (gameStateRef.current.snakes.length < NUM_INITIAL_NPCS + 1) {
            gameStateRef.current.snakes.push(createSnake(false, deadSnake.id));
          }
        }, 3000);
    }
  };
  
  const drawJoystick = (ctx: CanvasRenderingContext2D) => {
    const { joystick } = gameStateRef.current;
    if (!joystick.base.x) return; // Don't draw if not initialized

    ctx.beginPath();
    ctx.arc(joystick.base.x, joystick.base.y, joystick.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(joystick.knob.x, joystick.knob.y, joystick.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { player, snakes, food, camera, stars } = gameStateRef.current;
    const now = performance.now();
    
    if (player && player.body.length > 0) {
      camera.x = player.body[0].x - canvas.width / (2 * zoomLevel);
      camera.y = player.body[0].y - canvas.height / (2 * zoomLevel);
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0c0a18'; // Deep space blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-camera.x, -camera.y);

    const drawStars = (starLayer: Point[], factor: number, color: string, size: number) => {
        ctx.fillStyle = color;
        starLayer.forEach(star => {
            const x = (star.x - camera.x * factor) % MAP_WIDTH;
            const y = (star.y - camera.y * factor) % MAP_HEIGHT;
            ctx.fillRect(x < 0 ? x + MAP_WIDTH : x, y < 0 ? y + MAP_HEIGHT : y, size, size);
        });
    };
    drawStars(stars.far, 0.1, 'rgba(255, 255, 255, 0.4)', 1);
    drawStars(stars.mid, 0.2, 'rgba(255, 255, 255, 0.6)', 2);
    drawStars(stars.near, 0.3, 'rgba(255, 255, 255, 0.8)', 3);

    const gridSize = 100;
    ctx.strokeStyle = "rgba(100, 100, 255, 0.05)";
    ctx.lineWidth = 2 / zoomLevel;
    for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_WIDTH, y); ctx.stroke();
    }

    food.forEach(f => {
        let radius = f.radius;
        let alpha = 1.0;
        if(f.isNew && f.creationTime) {
            const age = now - f.creationTime;
            if(age < 500) {
                const progress = age / 500;
                radius = f.radius * (1 + 2 * (1-progress));
                alpha = progress;
            } else {
                f.isNew = false;
            }
        } else {
            const pulse = 0.8 + Math.sin(now / 200 + f.position.x) * 0.2;
            radius *= pulse;
        }

        ctx.beginPath();
        ctx.arc(f.position.x, f.position.y, radius, 0, Math.PI * 2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 10; // Reduced from 15
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    });

    snakes.forEach(snake => {
        if (!snake.body.length) return;
        const baseRadius = SNAKE_HEAD_RADIUS + snake.score * SNAKE_SCORE_TO_RADIUS_RATIO;
        
        ctx.shadowColor = snake.color;
        ctx.shadowBlur = 12; // Reduced from 20

        for (let i = snake.body.length - 1; i >= 0; i--) {
            const segment = snake.body[i];
            const radius = i === 0 ? baseRadius : baseRadius * SNAKE_BODY_RADIUS_MULTIPLIER;
            
            const gradient = ctx.createRadialGradient(segment.x, segment.y, radius * 0.1, segment.x, segment.y, radius);
            gradient.addColorStop(0, `hsl(${parseInt(snake.color.match(/(\d+)/)![0])}, 100%, 85%)`);
            gradient.addColorStop(1, snake.color);
            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;

        const head = snake.body[0];
        const angle = snake.currentAngle;
        const eyeRadius = baseRadius * 0.2;
        const eyeOffset = baseRadius * 0.4;
        const eye1X = head.x + Math.cos(angle + Math.PI/4) * eyeOffset;
        const eye1Y = head.y + Math.sin(angle + Math.PI/4) * eyeOffset;
        const eye2X = head.x + Math.cos(angle - Math.PI/4) * eyeOffset;
        const eye2Y = head.y + Math.sin(angle - Math.PI/4) * eyeOffset;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(eye1X + Math.cos(angle)*eyeRadius*0.5, eye1Y + Math.sin(angle)*eyeRadius*0.5, eyeRadius*0.5, 0, Math.PI * 2);
        ctx.arc(eye2X + Math.cos(angle)*eyeRadius*0.5, eye2Y + Math.sin(angle)*eyeRadius*0.5, eyeRadius*0.5, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.restore();

    if (controlMode === ControlMode.TOUCH) {
      drawJoystick(ctx);
    }
  };

  const gameLoop = useCallback((timestamp: number) => {
    const deltaTime = timestamp - gameStateRef.current.lastUpdateTime;
    gameStateRef.current.lastUpdateTime = timestamp;
    update(deltaTime);
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [controlMode]); // Add controlMode dependency

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    initializeGame();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    const handleMouseMove = (e: MouseEvent) => {
        gameStateRef.current.mousePos = { x: e.clientX, y: e.clientY };
    };
    const handlePointerDown = () => {
        if(gameStateRef.current.player) gameStateRef.current.player.isBoosting = true;
    }
    const handlePointerUp = () => {
        if(gameStateRef.current.player) gameStateRef.current.player.isBoosting = false;
    }
    
    // Joystick Touch Handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const { joystick, player } = gameStateRef.current;
      if (joystick.active) return;
      const touch = e.changedTouches[0];
      if (!touch || !player) return;

      joystick.active = true;
      joystick.touchId = touch.identifier;
      joystick.base = { x: window.innerWidth - 100, y: window.innerHeight - 100 };
      joystick.knob = { x: touch.clientX, y: touch.clientY };
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const { joystick, player } = gameStateRef.current;
      if (!joystick.active || !player) return;
      
      const touch = Array.from(e.changedTouches).find(t => t.identifier === joystick.touchId);
      if (!touch) return;

      const dx = touch.clientX - joystick.base.x;
      const dy = touch.clientY - joystick.base.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      
      const maxDist = joystick.baseRadius - joystick.knobRadius;
      if(dist > maxDist) {
        joystick.knob.x = joystick.base.x + Math.cos(angle) * maxDist;
        joystick.knob.y = joystick.base.y + Math.sin(angle) * maxDist;
        player.isBoosting = true;
      } else {
        joystick.knob.x = touch.clientX;
        joystick.knob.y = touch.clientY;
        player.isBoosting = false;
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const { joystick, player } = gameStateRef.current;
      if (!joystick.active || !player) return;

      const touch = Array.from(e.changedTouches).find(t => t.identifier === joystick.touchId);
      if (!touch) return;

      joystick.active = false;
      joystick.touchId = null;
      joystick.knob = joystick.base;
      player.isBoosting = false;
    }

    if(controlMode === ControlMode.POINTER) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('mouseup', handlePointerUp);
    } else { // TOUCH
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [controlMode, gameLoop, initializeGame]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default GameCanvas;
