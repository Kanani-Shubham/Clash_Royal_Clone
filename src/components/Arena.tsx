import React, { useEffect, useRef, useState } from 'react';
import { GameState, Entity } from '../shared/types';
import { ARENA, CARDS, MAX_ELIXIR } from '../shared/constants';
import { CHARACTER_COLORS, CHARACTER_EQUIPMENT, CHARACTER_ANIMATIONS, CHARACTER_BODY_TYPES, CHARACTER_MAPPING } from '../shared/characterData';
import { clsx } from 'clsx';

interface ArenaProps {
  state: GameState;
  playerId: string;
  isP1: boolean;
  onPlayCard: (cardId: string, x: number, y: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export function Arena({ state, playerId, isP1, onPlayCard }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const selectedCardRef = useRef<string | null>(null);
  const dragPositionRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    selectedCardRef.current = selectedCard;
  }, [selectedCard]);

  useEffect(() => {
    dragPositionRef.current = dragPosition;
  }, [dragPosition]);
  
  const particlesRef = useRef<Particle[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const prevEntitiesRef = useRef<Record<string, Entity>>({});
  const spawnTimesRef = useRef<Record<string, number>>({});
  const shakeRef = useRef<number>(0);

  const playerState = state.players[playerId];
  const opponentId = Object.keys(state.players).find(id => id !== playerId)!;
  const opponentState = state.players[opponentId];

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const createParticles = (x: number, y: number, isFriendly: boolean, count: number, color: string) => {
      const renderX = isP1 ? x : ARENA.width - x;
      const renderY = isP1 ? y : ARENA.height - y;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: renderX,
          y: renderY - 10,
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100 - 50,
          life: 0.5 + Math.random() * 0.5,
          maxLife: 1,
          color: color,
          size: 2 + Math.random() * 3
        });
      }
    };

    const shadeColor = (color: string, percent: number) => {
      let R = parseInt(color.substring(1,3),16);
      let G = parseInt(color.substring(3,5),16);
      let B = parseInt(color.substring(5,7),16);
      R = Math.floor(R * (100 + percent) / 100);
      G = Math.floor(G * (100 + percent) / 100);
      B = Math.floor(B * (100 + percent) / 100);
      R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255;
      R = (R>0)?R:0; G = (G>0)?G:0; B = (B>0)?B:0;
      const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
      const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
      const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
      return "#"+RR+GG+BB;
    };

    const drawCylinder = (x: number, y: number, radius: number, height: number, colorStr: string, isFriendly: boolean) => {
      // Body gradient
      const grad = ctx.createLinearGradient(x - radius, 0, x + radius, 0);
      grad.addColorStop(0, shadeColor(colorStr, -20));
      grad.addColorStop(0.5, colorStr);
      grad.addColorStop(1, shadeColor(colorStr, -40));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(x, y - height, radius, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.rect(x - radius, y - height, radius * 2, height);
      ctx.fill();

      // Top
      ctx.fillStyle = shadeColor(colorStr, 20);
      ctx.beginPath();
      ctx.ellipse(x, y - height, radius, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Team indicator ring on top
      ctx.strokeStyle = isFriendly ? '#3b82f6' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Detect events for effects
      const currentEntities: Record<string, Entity> = {};
      state.entities.forEach(e => {
        currentEntities[e.id] = e;
        const prev = prevEntitiesRef.current[e.id];
        
        if (!prev) {
          // Spawned
          spawnTimesRef.current[e.id] = Date.now();
          if (e.type === 'troop') {
            createParticles(e.x, e.y, isP1 ? e.owner === playerId : e.owner !== playerId, 10, '#ffffff');
          }
        } else {
          // Hit
          if (e.hp < prev.hp) {
            const damage = prev.hp - e.hp;
            const renderX = isP1 ? e.x : ARENA.width - e.x;
            const renderY = isP1 ? e.y : ARENA.height - e.y;
            createParticles(e.x, e.y, isP1 ? e.owner === playerId : e.owner !== playerId, 5, '#ffaa00');
            textsRef.current.push({
              x: renderX + (Math.random() - 0.5) * 20,
              y: renderY - 30,
              text: `-${Math.round(damage)}`,
              color: '#ff4444',
              life: 1,
              maxLife: 1
            });
            if (damage > 100) shakeRef.current = 5; // Screen shake for heavy hits
          }
        }
      });

      // Detect deaths
      Object.values(prevEntitiesRef.current).forEach(prev => {
        if (!currentEntities[prev.id]) {
          createParticles(prev.x, prev.y, isP1 ? prev.owner === playerId : prev.owner !== playerId, 20, '#ff0000');
          if (prev.type === 'tower') shakeRef.current = 15; // Big shake for tower death
        }
      });

      prevEntitiesRef.current = currentEntities;

      ctx.save();

      // Screen shake
      if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(dx, dy);
        shakeRef.current -= dt * 30;
        if (shakeRef.current < 0) shakeRef.current = 0;
      }

      // Clear & Grass
      ctx.fillStyle = '#8bc34a';
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);

      // Checkerboard
      ctx.fillStyle = '#7cb342';
      const tileSize = 30;
      for (let y = 0; y < ARENA.height; y += tileSize) {
        for (let x = 0; x < ARENA.width; x += tileSize) {
          if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
      }

      // Paths
      ctx.strokeStyle = 'rgba(180, 150, 100, 0.6)';
      ctx.lineWidth = 35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // P1 Paths
      ctx.beginPath();
      ctx.moveTo(ARENA.width / 2, ARENA.height - 40);
      ctx.lineTo(60 + ARENA.bridgeWidth/2, ARENA.height - 100);
      ctx.lineTo(60 + ARENA.bridgeWidth/2, ARENA.riverY + ARENA.riverHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ARENA.width / 2, ARENA.height - 40);
      ctx.lineTo(ARENA.width - 60 - ARENA.bridgeWidth/2, ARENA.height - 100);
      ctx.lineTo(ARENA.width - 60 - ARENA.bridgeWidth/2, ARENA.riverY + ARENA.riverHeight);
      ctx.stroke();

      // P2 Paths
      ctx.beginPath();
      ctx.moveTo(ARENA.width / 2, 40);
      ctx.lineTo(60 + ARENA.bridgeWidth/2, 100);
      ctx.lineTo(60 + ARENA.bridgeWidth/2, ARENA.riverY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ARENA.width / 2, 40);
      ctx.lineTo(ARENA.width - 60 - ARENA.bridgeWidth/2, 100);
      ctx.lineTo(ARENA.width - 60 - ARENA.bridgeWidth/2, ARENA.riverY);
      ctx.stroke();

      // Draw River
      const riverTime = time / 1000;
      ctx.fillStyle = '#29b6f6'; // Water
      ctx.fillRect(0, ARENA.riverY, ARENA.width, ARENA.riverHeight);
      
      // Animated water ripples
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < ARENA.width; i += 40) {
        const offset = Math.sin(riverTime * 2 + i * 0.1) * 5;
        ctx.beginPath();
        ctx.ellipse(i + 20, ARENA.riverY + ARENA.riverHeight/2 + offset, 15, 3, 0, 0, Math.PI*2);
        ctx.fill();
      }
      
      // River banks (stone/dirt)
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(0, ARENA.riverY - 4, ARENA.width, 4);
      ctx.fillRect(0, ARENA.riverY + ARENA.riverHeight, ARENA.width, 4);

      // Draw Bridges
      const drawBridge = (x: number) => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x + 4, ARENA.riverY + 4, ARENA.bridgeWidth, ARENA.riverHeight);
        
        // Base
        ctx.fillStyle = '#795548';
        ctx.fillRect(x, ARENA.riverY - 6, ARENA.bridgeWidth, ARENA.riverHeight + 12);
        
        // Planks
        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < ARENA.riverHeight + 12; i += 8) {
          ctx.fillRect(x + 2, ARENA.riverY - 4 + i, ARENA.bridgeWidth - 4, 6);
        }

        // Side rails (stone)
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(x - 2, ARENA.riverY - 8, 6, ARENA.riverHeight + 16);
        ctx.fillRect(x + ARENA.bridgeWidth - 4, ARENA.riverY - 8, 6, ARENA.riverHeight + 16);
      };
      
      drawBridge(60);
      drawBridge(ARENA.width - 60 - ARENA.bridgeWidth);

      // Sort entities by Y for depth sorting (2.5D)
      const sortedEntities = [...state.entities].sort((a, b) => {
        const renderYa = isP1 ? a.y : ARENA.height - a.y;
        const renderYb = isP1 ? b.y : ARENA.height - b.y;
        return renderYa - renderYb;
      });

      // Draw Entities
      sortedEntities.forEach(entity => {
        const renderX = isP1 ? entity.x : ARENA.width - entity.x;
        const renderY = isP1 ? entity.y : ARENA.height - entity.y;
        const isFriendly = entity.owner === playerId;
        
        // Spawn animation (scale up)
        const spawnTime = spawnTimesRef.current[entity.id] || 0;
        const age = Date.now() - spawnTime;
        let scale = 1;
        if (age < 300) {
          scale = age / 300;
          // Overshoot easing
          scale = 1 + 0.2 * Math.sin(scale * Math.PI);
        }

        ctx.save();
        ctx.translate(renderX, renderY);
        ctx.scale(scale, scale);

        // Hit flash
        const timeSinceHit = Date.now() - (entity as any)._lastHitTime || 1000;
        if (timeSinceHit < 100) {
          ctx.filter = 'brightness(200%)';
        }

        if (entity.type === 'tower') {
          const isKing = entity.cardId === 'king';
          const size = isKing ? 50 : 35;
          const height = isKing ? 40 : 30;
          const teamColor = isFriendly ? '#2196f3' : '#f44336';
          const teamDark = isFriendly ? '#1565c0' : '#c62828';

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(0, size/3, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Base (Stone)
          ctx.fillStyle = '#9e9e9e';
          ctx.fillRect(-size/2, -height, size, height);
          
          // Base shading
          ctx.fillStyle = '#757575';
          ctx.fillRect(size/4, -height, size/4, height);

          // Top Platform (Wood)
          ctx.fillStyle = '#795548';
          ctx.fillRect(-size/2 - 2, -height - 5, size + 4, 5);

          // Team colored cloth/banner
          ctx.fillStyle = teamColor;
          ctx.beginPath();
          ctx.moveTo(-size/2, -height);
          ctx.lineTo(size/2, -height);
          ctx.lineTo(size/2, -height + 15);
          ctx.lineTo(0, -height + 25);
          ctx.lineTo(-size/2, -height + 15);
          ctx.fill();

          // Crown/King indicator
          if (isKing) {
            ctx.fillStyle = '#ffb300';
            ctx.beginPath();
            ctx.moveTo(-15, -height - 5);
            ctx.lineTo(-10, -height - 20);
            ctx.lineTo(-5, -height - 10);
            ctx.lineTo(0, -height - 25);
            ctx.lineTo(5, -height - 10);
            ctx.lineTo(10, -height - 20);
            ctx.lineTo(15, -height - 5);
            ctx.fill();
          } else {
            // Princess indicator (small archer hat or just a smaller crown)
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.arc(0, -height - 10, 8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Health bar
          const hpPercent = Math.max(0, entity.hp / entity.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(-20, 10, 40, 6);
          ctx.fillStyle = isFriendly ? '#42a5f5' : '#ef5350';
          ctx.fillRect(-19, 11, 38 * hpPercent, 4);

        } else {
          // Troop
          const card = CARDS[entity.cardId!];
          const charType = CHARACTER_MAPPING[entity.cardId!] || 'medium';
          const bodyType = CHARACTER_BODY_TYPES[charType];
          const color = CHARACTER_COLORS[entity.cardId!] || card?.color || '#888';
          const equipment = CHARACTER_EQUIPMENT[entity.cardId!] || { weapon: 'none', armor: 'none', accessory: 'none' };
          const animStyle = CHARACTER_ANIMATIONS[entity.cardId!] || { idle: 'bouncy', walk: 'quick', attack: 'slash' };
          
          // Animation logic
          const isMoving = entity.speed > 0 && entity.hp > 0;
          const timeOffset = parseInt(entity.id, 36);
          
          // Base bobbing
          let bobOffset = 0;
          let tiltAngle = 0;
          let armRotation = 0;
          
          if (isMoving) {
            if (animStyle.walk === 'slow stomp') {
              bobOffset = Math.abs(Math.sin(time / 300 + timeOffset)) * 12;
              tiltAngle = Math.sin(time / 300 + timeOffset) * 0.1;
              armRotation = Math.sin(time / 300 + timeOffset) * 0.5;
            } else if (animStyle.walk === 'floating') {
              bobOffset = Math.sin(time / 400 + timeOffset) * 10 - 10; // Float above ground
            } else if (animStyle.walk === 'gallop') {
              bobOffset = Math.abs(Math.sin(time / 100 + timeOffset)) * 15;
              tiltAngle = Math.sin(time / 100 + timeOffset) * 0.2;
            } else { // quick, marching, etc
              bobOffset = Math.abs(Math.sin(time / 150 + timeOffset)) * 8;
              tiltAngle = Math.sin(time / 150 + timeOffset) * 0.15;
              armRotation = Math.sin(time / 150 + timeOffset) * 0.8;
            }
          } else {
            if (animStyle.idle === 'floating') {
              bobOffset = Math.sin(time / 500 + timeOffset) * 8 - 10;
            } else if (animStyle.idle === 'heavy idle') {
              bobOffset = Math.sin(time / 600 + timeOffset) * 3;
            } else {
              bobOffset = Math.sin(time / 300 + timeOffset) * 4;
            }
          }
          
          // Attack animation
          const timeSinceAttack = Date.now() - entity.lastAttackTime;
          let attackOffset = 0;
          let attackRotation = 0;
          let bodyRotation = 0;
          if (timeSinceAttack < 200) {
            const attackProgress = timeSinceAttack / 200;
            if (animStyle.attack === 'smash' || animStyle.attack === 'ground pound') {
              attackOffset = Math.sin(attackProgress * Math.PI) * 15;
              attackRotation = Math.sin(attackProgress * Math.PI) * 0.5;
            } else if (animStyle.attack === 'cast') {
              attackOffset = Math.sin(attackProgress * Math.PI) * -5; // Recoil
              armRotation = -Math.PI / 2; // Arm up
            } else if (animStyle.attack === 'shoot') {
              attackOffset = Math.sin(attackProgress * Math.PI) * -3; // Slight recoil
              armRotation = -Math.PI / 4; // Aiming forward
            } else if (animStyle.attack === 'spin') {
              bodyRotation = attackProgress * Math.PI * 4; // Spin twice
              armRotation = Math.PI / 2; // Arms out
            } else if (animStyle.attack === 'drop') {
              attackOffset = Math.sin(attackProgress * Math.PI) * 5; // Slight dip
              armRotation = Math.PI; // Drop arm straight down
            } else if (animStyle.attack === 'throw') {
              attackOffset = Math.sin(attackProgress * Math.PI) * -5; // Recoil
              armRotation = -Math.PI; // Full swing over head
            } else if (animStyle.attack === 'heavy swing') {
              attackOffset = Math.sin(attackProgress * Math.PI) * 12;
              attackRotation = Math.sin(attackProgress * Math.PI) * 1.2;
              armRotation = Math.sin(attackProgress * Math.PI) * Math.PI; // Big swing
            } else { // slash, swing, stab
              attackOffset = Math.sin(attackProgress * Math.PI) * 10;
              attackRotation = Math.sin(attackProgress * Math.PI) * 0.8;
            }
            attackOffset *= isFriendly ? -1 : 1; 
            attackRotation *= isFriendly ? -1 : 1;
          }

          ctx.translate(0, -bobOffset + attackOffset);
          ctx.rotate(tiltAngle);

          const r = bodyType.radius;
          const h = bodyType.height;
          
          const isFlying = entity.cardId === 'balloon';
          const flyingHeight = isFlying ? 40 : 0;

          // Draw Shadow
          ctx.save();
          ctx.translate(0, bobOffset - attackOffset); // Shadow stays on ground
          ctx.rotate(-tiltAngle);
          ctx.fillStyle = isFlying ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          const shadowScale = isFlying ? 0.6 : 1;
          ctx.ellipse(0, h/2, r * 1.5 * shadowScale, r * 0.8 * shadowScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Apply body rotation for spin attacks
          ctx.save();
          ctx.translate(0, -flyingHeight);
          ctx.rotate(bodyRotation);

          // Body
          if (entity.cardId === 'hog_rider') {
            // Draw the hog first
            ctx.fillStyle = '#78350f'; // Brown hog
            ctx.beginPath();
            ctx.ellipse(0, -h/3, r*1.5, r*0.8, 0, 0, Math.PI*2);
            ctx.fill();
            // Hog snout
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath();
            ctx.ellipse(isFriendly ? r*1.2 : -r*1.2, -h/3, r*0.4, r*0.3, 0, 0, Math.PI*2);
            ctx.fill();
            // Rider body
            drawCylinder(0, -h/3, r*0.8, h*0.66, color, isFriendly);
          } else if (entity.cardId === 'golem') {
            // Rocky body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-r, 0);
            ctx.lineTo(r, 0);
            ctx.lineTo(r * 1.2, -h / 2);
            ctx.lineTo(r * 0.8, -h);
            ctx.lineTo(-r * 0.8, -h);
            ctx.lineTo(-r * 1.2, -h / 2);
            ctx.fill();
            // Rock details
            ctx.fillStyle = shadeColor(color, -20);
            ctx.beginPath();
            ctx.arc(-r/2, -h/2, r/3, 0, Math.PI*2);
            ctx.arc(r/2, -h/3, r/4, 0, Math.PI*2);
            ctx.fill();
          } else if (entity.cardId === 'skeleton') {
            // Ribcage
            drawCylinder(0, 0, r*0.6, h, color, isFriendly);
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 2;
            for(let i=1; i<=3; i++) {
              ctx.beginPath();
              ctx.moveTo(-r*0.8, -h + i*4);
              ctx.lineTo(r*0.8, -h + i*4);
              ctx.stroke();
            }
          } else if (entity.cardId === 'mini_pekka') {
            // Robotic body
            ctx.fillStyle = color;
            ctx.fillRect(-r, -h, r*2, h);
            ctx.fillStyle = shadeColor(color, -20);
            ctx.fillRect(-r + 2, -h + 2, r*2 - 4, h - 4);
          } else {
            drawCylinder(0, 0, r, h, color, isFriendly);
          }
          
          // Armor/Clothing details
          if (equipment.armor === 'plate mail') {
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(-r, -h/2, r*2, h/2);
            // Cape
            ctx.fillStyle = isFriendly ? '#2563eb' : '#dc2626';
            ctx.beginPath();
            ctx.moveTo(-r, -h);
            ctx.lineTo(r, -h);
            ctx.lineTo(r*1.5, 0);
            ctx.lineTo(-r*1.5, 0);
            ctx.fill();
          } else if (equipment.armor === 'robes') {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-r - 2, 0);
            ctx.lineTo(r + 2, 0);
            ctx.lineTo(r, -h);
            ctx.lineTo(-r, -h);
            ctx.fill();
          } else if (equipment.armor === 'fur pelt') {
            ctx.fillStyle = '#78350f'; // Brown fur
            ctx.beginPath();
            ctx.moveTo(-r*1.1, -h/2);
            ctx.lineTo(r*1.1, -h/2);
            ctx.lineTo(r*0.8, 0);
            ctx.lineTo(-r*0.8, 0);
            ctx.fill();
            // Fur texture
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1;
            for(let i=0; i<5; i++) {
              ctx.beginPath();
              ctx.moveTo(-r + Math.random()*r*2, -h/2 + Math.random()*h/2);
              ctx.lineTo(-r + Math.random()*r*2, -h/2 + Math.random()*h/2);
              ctx.stroke();
            }
          } else if (equipment.armor === 'leather' || equipment.armor === 'leather tunic') {
            ctx.fillStyle = '#b45309'; // Orange-brown leather
            ctx.fillRect(-r, -h*0.8, r*2, h*0.8);
            if (equipment.armor === 'leather tunic') {
              ctx.fillStyle = '#78350f'; // Darker trim
              ctx.fillRect(-r, -h*0.8, r*2, h*0.2);
              ctx.fillRect(-r, -h*0.2, r*2, h*0.2);
            }
          } else if (equipment.armor === 'leather scraps') {
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.moveTo(-r, -h/2);
            ctx.lineTo(r, -h/2);
            ctx.lineTo(r*0.8, -h/4);
            ctx.lineTo(-r*0.5, -h/4);
            ctx.fill();
          } else if (equipment.armor === 'wood') {
            // Balloon basket
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-r*1.5, -h, r*3, h);
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2;
            ctx.strokeRect(-r*1.5, -h, r*3, h);
            // Wood planks
            for(let i=1; i<3; i++) {
              ctx.beginPath();
              ctx.moveTo(-r*1.5, -h + i*h/3);
              ctx.lineTo(r*1.5, -h + i*h/3);
              ctx.stroke();
            }
          }

          // Head
          const headSize = r * bodyType.head;
          let baseSkin = '#fcd34d'; // Skin tone
          if (entity.cardId === 'skeleton') baseSkin = '#f3f4f6';
          if (entity.cardId === 'golem') baseSkin = '#4b5563';
          if (entity.cardId === 'goblin') baseSkin = '#84cc16';
          if (entity.cardId === 'mini_pekka') baseSkin = '#1f2937';
          
          const eyeOffset = isFriendly ? -headSize/3 : headSize/3; 
          const eyeSize = Math.max(2, headSize / 5);

          if (entity.cardId === 'mini_pekka') {
            ctx.fillStyle = baseSkin;
            ctx.fillRect(-headSize, -h - headSize*1.5, headSize*2, headSize*1.5);
            // Glowing eye
            ctx.fillStyle = '#60a5fa';
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 10;
            ctx.fillRect(-headSize*0.6, -h - headSize, headSize*1.2, headSize*0.4);
            ctx.shadowBlur = 0;
          } else {
            const headGrad = ctx.createRadialGradient(-headSize/3, -h - headSize/2 - headSize/3, headSize/4, 0, -h - headSize/2, headSize);
            headGrad.addColorStop(0, shadeColor(baseSkin, 20));
            headGrad.addColorStop(0.7, baseSkin);
            headGrad.addColorStop(1, shadeColor(baseSkin, -30));
            
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(0, -h - headSize/2, headSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Face details
            ctx.fillStyle = '#000';
            
            // Goblin Ears
            if (entity.cardId === 'goblin') {
              ctx.fillStyle = baseSkin;
              ctx.beginPath();
              ctx.moveTo(-headSize*0.8, -h - headSize/2);
              ctx.lineTo(-headSize*1.5, -h - headSize*0.8);
              ctx.lineTo(-headSize*0.5, -h - headSize*0.2);
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(headSize*0.8, -h - headSize/2);
              ctx.lineTo(headSize*1.5, -h - headSize*0.8);
              ctx.lineTo(headSize*0.5, -h - headSize*0.2);
              ctx.fill();
              
              // Big nose
              ctx.beginPath();
              ctx.ellipse(0, -h - headSize/2 + eyeOffset + headSize/3, headSize/3, headSize/4, 0, 0, Math.PI*2);
              ctx.fill();
            }

            // Barbarian Beard
            if (entity.cardId === 'barbarian') {
              ctx.fillStyle = '#fbbf24'; // Yellow beard
              ctx.beginPath();
              ctx.arc(0, -h - headSize/3, headSize*0.8, 0, Math.PI);
              ctx.fill();
            }

            // Knight Mustache
            if (entity.cardId === 'knight') {
              ctx.fillStyle = '#f97316'; // Orange mustache
              ctx.beginPath();
              ctx.ellipse(0, -h - headSize/2 + eyeOffset + headSize/3, headSize/2, headSize/6, 0, 0, Math.PI*2);
              ctx.fill();
            }

            // Eyes
            if (entity.cardId === 'skeleton' || entity.cardId === 'golem') {
              ctx.fillStyle = entity.cardId === 'golem' ? '#c084fc' : '#000'; // Glowing eyes for golem
              if (entity.cardId === 'golem') {
                ctx.shadowColor = '#c084fc';
                ctx.shadowBlur = 8;
              }
              ctx.beginPath();
              ctx.arc(-headSize/2.5, -h - headSize/2 + eyeOffset, eyeSize, 0, Math.PI*2);
              ctx.arc(headSize/2.5, -h - headSize/2 + eyeOffset, eyeSize, 0, Math.PI*2);
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              ctx.beginPath();
              ctx.arc(-headSize/3, -h - headSize/2 + eyeOffset, eyeSize, 0, Math.PI*2);
              ctx.arc(headSize/3, -h - headSize/2 + eyeOffset, eyeSize, 0, Math.PI*2);
              ctx.fill();
              // Pupils
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(-headSize/3 + (isFriendly?0:1), -h - headSize/2 + eyeOffset - 1, eyeSize/2, 0, Math.PI*2);
              ctx.arc(headSize/3 + (isFriendly?0:1), -h - headSize/2 + eyeOffset - 1, eyeSize/2, 0, Math.PI*2);
              ctx.fill();
            }
          }

          // Accessories
          if (equipment.accessory === 'hat') {
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(-headSize*1.5, -h - headSize/4);
            ctx.lineTo(headSize*1.5, -h - headSize/4);
            ctx.lineTo(0, -h - headSize*2);
            ctx.fill();
          } else if (equipment.accessory === 'helmet') {
            ctx.fillStyle = '#9ca3af';
            ctx.beginPath();
            ctx.arc(0, -h - headSize/2, headSize*1.1, Math.PI, 0);
            ctx.fill();
          } else if (equipment.accessory === 'horns') {
            ctx.fillStyle = '#9ca3af';
            ctx.beginPath();
            ctx.moveTo(-headSize, -h - headSize);
            ctx.lineTo(-headSize*1.5, -h - headSize*1.5);
            ctx.lineTo(-headSize*0.5, -h - headSize*1.2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(headSize, -h - headSize);
            ctx.lineTo(headSize*1.5, -h - headSize*1.5);
            ctx.lineTo(headSize*0.5, -h - headSize*1.2);
            ctx.fill();
          } else if (equipment.accessory === 'balloon') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, -h - headSize*4, headSize*3, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-headSize*2, -h - headSize*3);
            ctx.lineTo(-headSize, -h - headSize);
            ctx.moveTo(headSize*2, -h - headSize*3);
            ctx.lineTo(headSize, -h - headSize);
            ctx.stroke();
          } else if (equipment.accessory === 'goggles') {
            ctx.fillStyle = '#1f2937'; // Dark strap
            ctx.fillRect(-headSize*1.1, -h - headSize/2 + eyeOffset - eyeSize, headSize*2.2, eyeSize*2);
            ctx.fillStyle = '#60a5fa'; // Blue glass
            ctx.beginPath();
            ctx.arc(-headSize/3, -h - headSize/2 + eyeOffset, eyeSize*1.5, 0, Math.PI*2);
            ctx.arc(headSize/3, -h - headSize/2 + eyeOffset, eyeSize*1.5, 0, Math.PI*2);
            ctx.fill();
          } else if (equipment.accessory === 'quiver') {
            // Draw quiver on back
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.moveTo(isFriendly ? -r*1.2 : r*1.2, -h*0.8);
            ctx.lineTo(isFriendly ? -r*0.8 : r*0.8, -h*0.2);
            ctx.lineTo(isFriendly ? -r*0.4 : r*0.4, -h*0.2);
            ctx.lineTo(isFriendly ? -r*0.8 : r*0.8, -h*0.8);
            ctx.fill();
            // Arrows sticking out
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(isFriendly ? -r*1.0 : r*1.0, -h*0.8);
            ctx.lineTo(isFriendly ? -r*1.2 : r*1.2, -h*1.2);
            ctx.moveTo(isFriendly ? -r*0.9 : r*0.9, -h*0.8);
            ctx.lineTo(isFriendly ? -r*0.9 : r*0.9, -h*1.2);
            ctx.stroke();
          } else if (equipment.accessory === 'shield') {
            ctx.fillStyle = '#9ca3af'; // Metal shield
            ctx.beginPath();
            ctx.ellipse(isFriendly ? -r*1.2 : r*1.2, -h/2, r*0.8, h*0.6, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#3b82f6'; // Blue cross
            ctx.fillRect(isFriendly ? -r*1.4 : r*1.0, -h/2 - h*0.4, r*0.4, h*0.8);
            ctx.fillRect(isFriendly ? -r*1.8 : r*0.6, -h/2 - h*0.1, r*1.2, h*0.2);
          } else if (equipment.accessory === 'pouch') {
            ctx.fillStyle = '#78350f'; // Brown pouch
            ctx.beginPath();
            ctx.arc(isFriendly ? -r : r, -h/4, r*0.6, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24'; // Gold coin sticking out
            ctx.beginPath();
            ctx.arc(isFriendly ? -r : r, -h/4 - r*0.4, r*0.2, 0, Math.PI*2);
            ctx.fill();
          } else if (equipment.accessory === 'belt') {
            ctx.fillStyle = '#1f2937'; // Dark belt
            ctx.fillRect(-r*1.1, -h/3, r*2.2, h/6);
            ctx.fillStyle = '#fbbf24'; // Gold buckle
            ctx.fillRect(-r*0.4, -h/3 - h/12, r*0.8, h/3);
          } else if (equipment.accessory === 'bone') {
            ctx.fillStyle = '#f3f4f6'; // Bone color
            ctx.beginPath();
            ctx.ellipse(0, -h - headSize*1.2, headSize*0.8, headSize*0.2, Math.PI/4, 0, Math.PI*2);
            ctx.fill();
          }

          // Arms & Weapons
          ctx.save();
          ctx.translate(isFriendly ? r : -r, -h/1.5);
          ctx.rotate(armRotation + attackRotation);
          
          // Arm
          ctx.fillStyle = baseSkin;
          
          const armLength = h * bodyType.arms;
          const armWidth = Math.max(3, r * 0.4);
          ctx.fillRect(-armWidth/2, 0, armWidth, armLength);
          
          // Weapon
          ctx.translate(0, armLength);
          if (equipment.weapon === 'sword' || equipment.weapon === 'dagger' || equipment.weapon === 'short sword') {
            ctx.fillStyle = '#9ca3af';
            const wLen = equipment.weapon === 'dagger' ? 15 : 25;
            ctx.fillRect(-2, 0, 4, wLen);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-4, -2, 8, 4); // Hilt
          } else if (equipment.weapon === 'staff') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-2, -10, 4, 35);
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 25, 6, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (equipment.weapon === 'bow') {
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 10, 15, -Math.PI/2, Math.PI/2);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(0, 25);
            ctx.stroke();
          } else if (equipment.weapon === 'musket') {
            ctx.fillStyle = '#78350f'; // Wood stock
            ctx.fillRect(-2, -5, 4, 20);
            ctx.fillStyle = '#9ca3af'; // Metal barrel
            ctx.fillRect(-1, 15, 2, 25);
            ctx.fillStyle = '#4b5563'; // Details
            ctx.fillRect(-3, 10, 6, 5);
          } else if (equipment.weapon === 'club' || equipment.weapon === 'hammer' || equipment.weapon === 'axe') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-3, -5, 6, 30);
            ctx.fillStyle = '#9ca3af';
            if (equipment.weapon === 'axe') {
              ctx.beginPath();
              ctx.arc(5, 20, 10, -Math.PI/2, Math.PI/2);
              ctx.fill();
            } else {
              ctx.fillRect(-8, 20, 16, 12);
            }
          } else if (equipment.weapon === 'bomb') {
            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(0, 5, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24'; // spark
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 5;
            ctx.fillRect(-1, -5, 2, 4);
            ctx.shadowBlur = 0;
          } else if (equipment.weapon === 'fist') {
            ctx.fillStyle = color; // Same as body
            ctx.beginPath();
            ctx.arc(0, 10, r*0.8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = shadeColor(color, -20);
            ctx.beginPath();
            ctx.arc(-r*0.2, 5, r*0.3, 0, Math.PI*2);
            ctx.arc(r*0.2, 12, r*0.2, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.restore();

          // Restore body rotation
          ctx.restore();

          // Health bar
          const hpPercent = Math.max(0, entity.hp / entity.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-15, -h - headSize*2 - 10 - flyingHeight, 30, 4);
          ctx.fillStyle = isFriendly ? '#3b82f6' : '#ef4444';
          ctx.fillRect(-15, -h - headSize*2 - 10 - flyingHeight, 30 * hpPercent, 4);
        }

        // Store last hit time for flash effect (hacky but works for visual)
        const prev = prevEntitiesRef.current[entity.id];
        if (prev && entity.hp < prev.hp) {
          (entity as any)._lastHitTime = Date.now();
        }

        ctx.restore();
      });

      // Render Projectiles
      state.projectiles?.forEach(proj => {
        const renderX = isP1 ? proj.x : ARENA.width - proj.x;
        const renderY = isP1 ? proj.y : ARENA.height - proj.y;
        
        ctx.save();
        ctx.translate(renderX, renderY);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Projectile body (glowing orb)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#fbbf24');
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Render Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Render Floating Texts
      for (let i = textsRef.current.length - 1; i >= 0; i--) {
        const t = textsRef.current[i];
        t.y -= 20 * dt; // Float up
        t.life -= dt;
        
        if (t.life <= 0) {
          textsRef.current.splice(i, 1);
          continue;
        }
        
        ctx.globalAlpha = t.life / t.maxLife;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1;
      }

      // Render Drag Ghost
      if (dragPositionRef.current && selectedCardRef.current) {
        const { x, y } = dragPositionRef.current;
        const cardId = selectedCardRef.current;
        const card = CARDS[cardId];
        
        if (card) {
          ctx.save();
          ctx.translate(x, y);
          ctx.globalAlpha = 0.6;
          
          // Draw placement indicator
          const isValidPlacement = y >= ARENA.riverY + ARENA.riverHeight;
          ctx.fillStyle = isValidPlacement ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          ctx.strokeStyle = isValidPlacement ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw character ghost
          const charType = CHARACTER_MAPPING[cardId] || 'medium';
          const bodyType = CHARACTER_BODY_TYPES[charType] || { radius: 10, height: 20, head: 1, arms: 1 };
          const color = CHARACTER_COLORS[cardId] || card.color || '#888';
          
          if (card.type === 'troop') {
            drawCylinder(0, 0, bodyType.radius, bodyType.height, color, true);
          } else if (card.type === 'spell') {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, isP1, playerId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedCard || state.status !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clickX = (e.clientX - rect.left) * scaleX;
    let clickY = (e.clientY - rect.top) * scaleY;

    // Must place on own side (bottom half of the screen, below river)
    if (clickY < ARENA.riverY + ARENA.riverHeight) return;

    // Transform back to server coordinates if P2
    const serverX = isP1 ? clickX : ARENA.width - clickX;
    const serverY = isP1 ? clickY : ARENA.height - clickY;

    onPlayCard(selectedCard, serverX, serverY);
    setSelectedCard(null);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setDragPosition(null);
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId || state.status !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let dropX = (e.clientX - rect.left) * scaleX;
    let dropY = (e.clientY - rect.top) * scaleY;

    // Must place on own side (bottom half of the screen, below river)
    if (dropY < ARENA.riverY + ARENA.riverHeight) {
      setSelectedCard(null);
      return;
    }

    // Transform back to server coordinates if P2
    const serverX = isP1 ? dropX : ARENA.width - dropX;
    const serverY = isP1 ? dropY : ARENA.height - dropY;

    onPlayCard(cardId, serverX, serverY);
    setSelectedCard(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let dragX = (e.clientX - rect.left) * scaleX;
    let dragY = (e.clientY - rect.top) * scaleY;
    
    setDragPosition({ x: dragX, y: dragY });
  };

  const handleCanvasDragLeave = () => {
    setDragPosition(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedCard) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let moveX = (e.clientX - rect.left) * scaleX;
    let moveY = (e.clientY - rect.top) * scaleY;
    
    setDragPosition({ x: moveX, y: moveY });
  };

  const handleCanvasMouseLeave = () => {
    if (selectedCard) {
      setDragPosition(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      {/* Top HUD - Glassmorphism */}
      <div className="flex justify-between items-center w-full px-4 bg-zinc-900/60 backdrop-blur-md rounded-2xl py-3 shadow-xl border border-white/10 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-800 rounded-full border-2 border-red-300 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            🤖
          </div>
          <div className="flex flex-col">
            <span className="text-red-300 font-bold text-xs uppercase tracking-wider">Enemy</span>
            <span className="text-yellow-400 font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">👑 {opponentState?.crowns || 0}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center bg-black/40 px-5 py-2 rounded-xl border border-white/10 shadow-inner">
          <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Time</span>
          <div className="text-white font-mono text-2xl font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{formatTime(state.timeRemaining)}</div>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div className="flex flex-col items-end">
            <span className="text-blue-300 font-bold text-xs uppercase tracking-wider">You</span>
            <span className="text-yellow-400 font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{playerState?.crowns || 0} 👑</span>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-800 rounded-full border-2 border-blue-300 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            😎
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-4 ring-zinc-800/50">
        <canvas
          ref={canvasRef}
          width={ARENA.width}
          height={ARENA.height}
          onClick={handleCanvasClick}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          className={clsx(
            "bg-zinc-900 block",
            selectedCard ? "cursor-crosshair" : "cursor-default"
          )}
        />
        
        {/* Game Over Overlay */}
        {state.status === 'ended' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <h2 className={clsx(
              "text-6xl font-black mb-6 drop-shadow-[0_5px_5px_rgba(0,0,0,1)] text-transparent bg-clip-text",
              state.winner === 'draw' ? "bg-gradient-to-b from-gray-300 to-gray-500" :
              state.winner === playerId ? "bg-gradient-to-b from-yellow-300 to-yellow-600" : "bg-gradient-to-b from-red-400 to-red-700"
            )}>
              {state.winner === 'draw' ? 'DRAW' : state.winner === playerId ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-gradient-to-b from-blue-500 to-blue-700 text-white font-bold text-xl rounded-xl shadow-[0_5px_0_#1e3a8a] hover:translate-y-1 hover:shadow-[0_2px_0_#1e3a8a] transition-all"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom HUD (Cards & Elixir) - Glassmorphism */}
      <div className="w-full bg-zinc-900/60 backdrop-blur-xl rounded-t-3xl p-4 border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between gap-3 mb-4">
          {playerState?.hand?.map((cardId, index) => {
            const card = CARDS[cardId];
            if (!card) return null;
            
            const canAfford = playerState && playerState.elixir >= card.cost;
            const isSelected = selectedCard === card.id;
            
            return (
              <button
                key={`${card.id}-${index}`}
                onClick={() => canAfford && setSelectedCard(isSelected ? null : card.id)}
                disabled={!canAfford || state.status !== 'playing'}
                draggable={canAfford && state.status === 'playing'}
                onDragStart={(e) => {
                  e.dataTransfer.setData('cardId', card.id);
                  setSelectedCard(card.id);
                }}
                className={clsx(
                  "flex-1 relative aspect-[5/6] rounded-sm border-2 transition-all duration-200 overflow-hidden flex flex-col items-center justify-center bg-zinc-300",
                  isSelected 
                    ? "border-yellow-400 -translate-y-4 shadow-[0_10px_20px_rgba(250,204,21,0.4)] scale-105" 
                    : clsx(
                        "hover:-translate-y-2 shadow-lg",
                        card.rarity === 'Rare' ? "border-orange-500" :
                        card.rarity === 'Epic' ? "border-purple-500" :
                        card.rarity === 'Legendary' ? "border-yellow-500" :
                        "border-blue-500"
                      ),
                  canAfford ? "opacity-100 cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
                )}
              >
                {/* Card Background (Rarity color) */}
                <div className={clsx(
                  "absolute inset-0 bg-gradient-to-b",
                  card.rarity === 'Rare' ? "from-orange-300 to-orange-500" :
                  card.rarity === 'Epic' ? "from-purple-400 to-purple-600" :
                  card.rarity === 'Legendary' ? "from-yellow-300 via-red-300 to-yellow-500" :
                  "from-blue-200 to-blue-400"
                )}></div>
                
                {/* Elixir Drop */}
                <div className="absolute top-0 left-0 bg-fuchsia-600 text-white text-[10px] font-black w-5 h-6 flex items-center justify-center shadow-md border-r border-b border-fuchsia-300 z-10" style={{ borderBottomRightRadius: '50%', borderBottomLeftRadius: '50%', borderTopRightRadius: '50%' }}>
                  {card.cost}
                </div>
                
                {/* Character Image */}
                <img 
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${card.name}&backgroundColor=transparent`} 
                  alt={card.name}
                  className="w-full h-full object-cover absolute top-2 scale-125"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-4xl drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] mb-1 z-10 relative">
                  {card.emoji}
                </div>
                
                {/* Card Name Banner */}
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-1 z-10">
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider block text-center" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                    {card.name}
                  </span>
                </div>
                
                {/* Card Frame/Border overlay */}
                <div className="absolute inset-0 border-4 border-zinc-400/50 rounded-sm pointer-events-none z-20"></div>
              </button>
            );
          })}
          
          {/* Next Card Indicator */}
          <div className="w-16 flex flex-col items-center justify-center opacity-80">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Next</span>
            <div className={clsx(
              "w-full aspect-[5/6] rounded-sm border-2 bg-zinc-300 flex items-center justify-center shadow-inner relative overflow-hidden",
              playerState?.nextCard && CARDS[playerState.nextCard]?.rarity === 'Rare' ? "border-orange-500" :
              playerState?.nextCard && CARDS[playerState.nextCard]?.rarity === 'Epic' ? "border-purple-500" :
              playerState?.nextCard && CARDS[playerState.nextCard]?.rarity === 'Legendary' ? "border-yellow-500" :
              "border-blue-500"
            )}>
               {playerState?.nextCard && (
                 <>
                   <div className={clsx(
                     "absolute inset-0 bg-gradient-to-b",
                     CARDS[playerState.nextCard]?.rarity === 'Rare' ? "from-orange-300 to-orange-500" :
                     CARDS[playerState.nextCard]?.rarity === 'Epic' ? "from-purple-400 to-purple-600" :
                     CARDS[playerState.nextCard]?.rarity === 'Legendary' ? "from-yellow-300 via-red-300 to-yellow-500" :
                     "from-blue-200 to-blue-400"
                   )}></div>
                   <img 
                     src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${CARDS[playerState.nextCard]?.name}&backgroundColor=transparent`} 
                     alt={CARDS[playerState.nextCard]?.name}
                     className="w-full h-full object-cover absolute top-2 scale-125 opacity-70"
                     onError={(e) => {
                       e.currentTarget.style.display = 'none';
                       e.currentTarget.nextElementSibling?.classList.remove('hidden');
                     }}
                   />
                   <div className="hidden text-2xl opacity-50 z-10 relative">{CARDS[playerState.nextCard]?.emoji}</div>
                   <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-1 z-10">
                     <span className="text-[8px] font-bold text-zinc-300 uppercase block text-center" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                       {CARDS[playerState.nextCard]?.name}
                     </span>
                   </div>
                   <div className="absolute inset-0 border-4 border-zinc-400/50 rounded-sm pointer-events-none z-20"></div>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* Elixir Bar */}
        <div className="relative h-6 bg-black/50 rounded-full border border-white/10 overflow-hidden shadow-inner flex items-center px-1">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-fuchsia-600 via-purple-500 to-fuchsia-400 transition-all duration-300 ease-out"
            style={{ 
              width: `${((playerState?.elixir || 0) / MAX_ELIXIR) * 100}%`,
              boxShadow: playerState?.elixir === MAX_ELIXIR ? '0 0 15px #d946ef' : 'none'
            }}
          >
            {/* Animated shine effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent"></div>
          </div>
          
          {/* Elixir markers */}
          <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-px h-3 bg-white/20"></div>
            ))}
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white font-black text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {Math.floor(playerState?.elixir || 0)} / {MAX_ELIXIR}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
