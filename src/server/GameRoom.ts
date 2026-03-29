import { Server, Socket } from 'socket.io';
import { GameState, Entity, PlayerId } from '../shared/types';
import { ARENA, CARDS, TICK_RATE, MATCH_DURATION, ELIXIR_RATE, MAX_ELIXIR } from '../shared/constants';

export class GameRoom {
  id: string;
  p1: Socket;
  p2: Socket;
  state: GameState;
  interval: NodeJS.Timeout | null = null;
  io: Server;

  constructor(id: string, p1: Socket, p2: Socket, io: Server, p1Deck: string[], p2Deck: string[]) {
    this.id = id;
    this.p1 = p1;
    this.p2 = p2;
    this.io = io;

    const shuffle = (array: string[]) => {
      const newArr = [...array];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

    const p1Shuffled = shuffle(p1Deck);
    const p2Shuffled = shuffle(p2Deck);

    this.state = {
      roomId: id,
      players: {
        [p1.id]: { 
          id: p1.id, 
          elixir: 5, 
          crowns: 0,
          deck: p1Shuffled.slice(5),
          hand: p1Shuffled.slice(0, 4),
          nextCard: p1Shuffled[4]
        },
        [p2.id]: { 
          id: p2.id, 
          elixir: 5, 
          crowns: 0,
          deck: p2Shuffled.slice(5),
          hand: p2Shuffled.slice(0, 4),
          nextCard: p2Shuffled[4]
        },
      },
      entities: [],
      projectiles: [],
      timeRemaining: MATCH_DURATION,
      status: 'playing',
    };

    this.initTowers();
    this.setupListeners(p1);
    this.setupListeners(p2);

    this.interval = setInterval(() => this.tick(), TICK_RATE);
    
    this.io.to(this.id).emit('match_start', this.state);
  }

  initTowers() {
    const createTower = (owner: string, x: number, y: number, isKing: boolean): Entity => ({
      id: Math.random().toString(36).substring(7),
      type: 'tower',
      owner,
      x,
      y,
      hp: isKing ? 3000 : 1500,
      maxHp: isKing ? 3000 : 1500,
      damage: isKing ? 80 : 60,
      range: 150,
      speed: 0,
      attackSpeed: 1000,
      lastAttackTime: 0,
      cardId: isKing ? 'king' : 'princess'
    });

    // P1 Towers (Bottom)
    this.state.entities.push(createTower(this.p1.id, ARENA.width / 2, ARENA.height - 40, true));
    this.state.entities.push(createTower(this.p1.id, 80, ARENA.height - 120, false));
    this.state.entities.push(createTower(this.p1.id, ARENA.width - 80, ARENA.height - 120, false));

    // P2 Towers (Top)
    this.state.entities.push(createTower(this.p2.id, ARENA.width / 2, 40, true));
    this.state.entities.push(createTower(this.p2.id, 80, 120, false));
    this.state.entities.push(createTower(this.p2.id, ARENA.width - 80, 120, false));
  }

  setupListeners(socket: Socket) {
    socket.on('play_card', ({ cardId, x, y }) => {
      this.playCard(socket.id, cardId, x, y);
    });

    socket.on('bot_play_card', ({ botId, cardId, x, y }) => {
      if (this.p2.id === botId && socket.id === this.p1.id) {
        this.playCard(botId, cardId, x, y);
      }
    });

    socket.on('disconnect', () => {
      this.endGame(socket.id === this.p1.id ? this.p2.id : this.p1.id);
    });
  }

  playCard(playerId: string, cardId: string, x: number, y: number) {
    if (this.state.status !== 'playing') return;
    const player = this.state.players[playerId];
    const card = CARDS[cardId];
    if (!card || player.elixir < card.cost) return;

    // Verify card is in hand
    const handIndex = player.hand.indexOf(cardId);
    if (handIndex === -1) return;

    // Validate placement (must be on own side and not in river)
    const isP1 = playerId === this.p1.id;
    if (isP1 && y < ARENA.riverY + ARENA.riverHeight) return;
    if (!isP1 && y > ARENA.riverY) return;

    player.elixir -= card.cost;
    
    // Cycle deck
    player.hand[handIndex] = player.nextCard;
    player.deck.push(cardId);
    player.nextCard = player.deck.shift()!;
    
    this.state.entities.push({
      id: Math.random().toString(36).substring(7),
      type: 'troop',
      owner: playerId,
      cardId,
      x,
      y,
      hp: card.hp,
      maxHp: card.hp,
      damage: card.damage,
      range: card.range,
      speed: card.speed,
      attackSpeed: card.attackSpeed,
      lastAttackTime: 0,
      targetsBuildingsOnly: card.targetsBuildingsOnly
    });
  }

  tick() {
    if (this.state.status !== 'playing') return;

    // Elixir generation
    const elixirGain = (ELIXIR_RATE * TICK_RATE) / 1000;
    Object.values(this.state.players).forEach(p => {
      p.elixir = Math.min(MAX_ELIXIR, p.elixir + elixirGain);
    });

    // Time
    this.state.timeRemaining -= TICK_RATE / 1000;
    if (this.state.timeRemaining <= 0) {
      this.endGameByTime();
      return;
    }

    const now = Date.now();

    // Process Projectiles
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      const target = this.state.entities.find(e => e.id === proj.targetId);
      
      if (!target || target.hp <= 0) {
        this.state.projectiles.splice(i, 1);
        continue;
      }

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = (proj.speed * TICK_RATE) / 1000;

      if (dist <= moveDist) {
        // Hit
        const wasAlive = target.hp > 0;
        target.hp -= proj.damage;
        this.state.projectiles.splice(i, 1);
        
        if (wasAlive && target.hp <= 0 && target.type === 'tower') {
          this.state.players[proj.owner].crowns++;
          if (target.cardId === 'king') {
            this.endGame(proj.owner);
            return;
          }
        }
      } else {
        proj.x += (dx / dist) * moveDist;
        proj.y += (dy / dist) * moveDist;
      }
    }

    // Movement and Combat
    for (const entity of this.state.entities) {
      if (entity.hp <= 0) continue;

      // Find target
      let target: Entity | null = null;
      let minDistance = Infinity;

      for (const other of this.state.entities) {
        if (other.hp <= 0 || other.owner === entity.owner) continue;
        if (entity.targetsBuildingsOnly && other.type !== 'tower') continue;

        const dx = other.x - entity.x;
        const dy = other.y - entity.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Aggro range for troops is generally larger than attack range, let's say 200
        const aggroRange = entity.type === 'tower' ? entity.range : (entity.targetsBuildingsOnly ? Infinity : 200);
        
        if (dist < minDistance && dist <= aggroRange) {
          minDistance = dist;
          target = other;
        }
      }

      // If no target in aggro range, move towards nearest tower
      if (!target && entity.type === 'troop') {
        for (const other of this.state.entities) {
          if (other.hp <= 0 || other.owner === entity.owner || other.type !== 'tower') continue;
          const dx = other.x - entity.x;
          const dy = other.y - entity.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            minDistance = dist;
            target = other;
          }
        }
      }

      if (target) {
        const dx = target.x - entity.x;
        const dy = target.y - entity.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= entity.range) {
          // Attack
          if (now - entity.lastAttackTime >= entity.attackSpeed) {
            entity.lastAttackTime = now;
            
            // Ranged attack uses projectiles
            if (entity.range > 50) {
              this.state.projectiles.push({
                id: Math.random().toString(36).substring(7),
                owner: entity.owner,
                x: entity.x,
                y: entity.y,
                targetId: target.id,
                damage: entity.damage,
                speed: 300 // Projectile speed
              });
            } else {
              // Melee attack
              const wasAlive = target.hp > 0;
              target.hp -= entity.damage;
              
              if (wasAlive && target.hp <= 0 && target.type === 'tower') {
                this.state.players[entity.owner].crowns++;
                if (target.cardId === 'king') {
                  this.endGame(entity.owner);
                  return;
                }
              }
            }
          }
        } else if (entity.type === 'troop') {
          // Move
          let moveTargetX = target.x;
          let moveTargetY = target.y;

          const isTop = entity.y <= ARENA.riverY;
          const isBottom = entity.y >= ARENA.riverY + ARENA.riverHeight;
          const targetIsTop = target.y <= ARENA.riverY;
          const targetIsBottom = target.y >= ARENA.riverY + ARENA.riverHeight;

          const getNearestBridgeX = (x: number) => Math.abs(x - 90) < Math.abs(x - 310) ? 90 : 310;

          if (isTop && targetIsBottom) {
             const bridgeX = getNearestBridgeX(entity.x);
             if (Math.abs(entity.x - bridgeX) > 5) {
                moveTargetX = bridgeX;
                moveTargetY = ARENA.riverY;
             } else {
                moveTargetX = bridgeX;
                moveTargetY = ARENA.riverY + ARENA.riverHeight + 10;
             }
          } else if (isBottom && targetIsTop) {
             const bridgeX = getNearestBridgeX(entity.x);
             if (Math.abs(entity.x - bridgeX) > 5) {
                moveTargetX = bridgeX;
                moveTargetY = ARENA.riverY + ARENA.riverHeight;
             } else {
                moveTargetX = bridgeX;
                moveTargetY = ARENA.riverY - 10;
             }
          } else if (!isTop && !isBottom) {
             // On bridge
             moveTargetX = entity.x;
             moveTargetY = targetIsTop ? ARENA.riverY - 10 : ARENA.riverY + ARENA.riverHeight + 10;
          }

          const moveDx = moveTargetX - entity.x;
          const moveDy = moveTargetY - entity.y;
          const moveDistTotal = Math.sqrt(moveDx * moveDx + moveDy * moveDy);

          if (moveDistTotal > 0) {
            const maxMoveDist = (entity.speed * TICK_RATE) / 1000;
            const isMovingToTarget = moveTargetX === target.x && moveTargetY === target.y;
            const distToStop = isMovingToTarget ? Math.max(0, moveDistTotal - entity.range) : moveDistTotal;
            
            const moveDist = Math.min(maxMoveDist, distToStop);
            entity.x += (moveDx / moveDistTotal) * moveDist;
            entity.y += (moveDy / moveDistTotal) * moveDist;
          }
        }
      }

      // Collision avoidance (separation)
      if (entity.type === 'troop') {
        for (const other of this.state.entities) {
          if (other.id === entity.id || other.type !== 'troop' || other.hp <= 0) continue;
          const dx = entity.x - other.x;
          const dy = entity.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minSeparation = 15; // Radius
          
          if (dist > 0 && dist < minSeparation) {
            const pushForce = (minSeparation - dist) / 2;
            entity.x += (dx / dist) * pushForce;
            entity.y += (dy / dist) * pushForce;
          }
        }
      }
    }

    // Remove dead entities
    this.state.entities = this.state.entities.filter(e => e.hp > 0);

    // Broadcast state
    this.io.to(this.id).emit('sync', this.state);
  }

  endGameByTime() {
    const p1Crowns = this.state.players[this.p1.id].crowns;
    const p2Crowns = this.state.players[this.p2.id].crowns;
    
    if (p1Crowns > p2Crowns) this.endGame(this.p1.id);
    else if (p2Crowns > p1Crowns) this.endGame(this.p2.id);
    else this.endGame('draw');
  }

  endGame(winnerId: string) {
    this.state.status = 'ended';
    this.state.winner = winnerId;
    if (this.interval) clearInterval(this.interval);
    this.io.to(this.id).emit('game_over', this.state);
  }
}
