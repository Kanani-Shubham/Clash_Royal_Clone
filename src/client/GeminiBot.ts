import { GoogleGenAI, Type } from '@google/genai';
import { GameState } from '../shared/types';
import { Socket } from 'socket.io-client';

export class GeminiBotClient {
  botId: string;
  ai: GoogleGenAI;
  interval: NodeJS.Timeout | null = null;
  socket: Socket;
  latestState: GameState | null = null;
  isQuotaExceeded: boolean = false;

  constructor(botId: string, socket: Socket) {
    this.botId = botId;
    this.socket = socket;
    console.log("Initializing GeminiBotClient with API Key length:", process.env.GEMINI_API_KEY?.length);
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  start() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.makeMove(), 3000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  updateState(state: GameState) {
    this.latestState = state;
  }

  async makeMove() {
    if (!this.latestState || this.latestState.status !== 'playing') {
      this.stop();
      return;
    }

    const myState = this.latestState.players[this.botId];
    if (!myState) return;
    const myElixir = myState.elixir;
    if (myElixir < 2) return; // Can't play anything anyway

    const myHand = myState.hand;
    if (!myHand || myHand.length === 0) return;

    const entities = this.latestState.entities.map(e => ({
      type: e.type,
      card: e.cardId,
      isMine: e.owner === this.botId,
      x: Math.round(e.x),
      y: Math.round(e.y),
      hp: Math.round(e.hp)
    }));

    const handStr = myHand.join(', ');

    const prompt = `You are an AI playing a Clash Royale clone. You are Player 2.
Arena width: 400, height: 600.
Your side is Y: 0 to 280. You can ONLY place cards on your side (Y between 0 and 280).
Enemy side is Y: 320 to 600.
Your elixir: ${Math.floor(myElixir)}
Your hand: ${handStr}
Entities on board: ${JSON.stringify(entities)}

Decide your next move to defend your towers and attack the enemy.
Respond ONLY in valid JSON format.`;

    if (this.isQuotaExceeded) {
      this.playRandomCard(myHand, myElixir);
      return;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: "'play' or 'wait'" },
              cardId: { type: Type.STRING, description: `One of: ${handStr}` },
              x: { type: Type.NUMBER, description: "X coordinate (0-400)" },
              y: { type: Type.NUMBER, description: "Y coordinate (0-280)" }
            },
            required: ["action"]
          }
        }
      });

      const text = response.text;
      if (!text) return;
      const decision = JSON.parse(text);

      if (decision.action === 'play' && decision.cardId && decision.x !== undefined && decision.y !== undefined) {
        // Ensure Y is on bot's side (0 to 280)
        const safeY = Math.min(Math.max(decision.y, 0), 280);
        const safeX = Math.min(Math.max(decision.x, 0), 400);
        
        // Emit the play_card event as the bot
        this.socket.emit('bot_play_card', {
          botId: this.botId,
          cardId: decision.cardId,
          x: safeX,
          y: safeY
        });
      }
    } catch (e: any) {
      console.error('Gemini Bot Error:', e);
      
      if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
        this.isQuotaExceeded = true;
      }
      
      // Fallback: Play a random card if API fails and we have enough elixir
      this.playRandomCard(myHand, myElixir);
    }
  }

  private playRandomCard(myHand: string[], myElixir: number) {
    if (myHand.length > 0 && myElixir >= 3) {
      const randomCard = myHand[Math.floor(Math.random() * myHand.length)];
      const randomX = Math.floor(Math.random() * 400);
      const randomY = Math.floor(Math.random() * 280);
      
      this.socket.emit('bot_play_card', {
        botId: this.botId,
        cardId: randomCard,
        x: randomX,
        y: randomY
      });
    }
  }
}
