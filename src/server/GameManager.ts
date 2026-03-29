import { Server, Socket } from 'socket.io';
import { GameRoom } from './GameRoom';

export class GameManager {
  io: Server;
  queue: { socket: Socket, deck: string[] }[] = [];
  rooms: Map<string, GameRoom> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  handleConnection(socket: Socket) {
    console.log('Player connected:', socket.id);

    socket.on('join_queue', (payload?: { deck: string[] }) => {
      const deck = payload?.deck?.length === 8 ? payload.deck : ['knight', 'archer', 'giant', 'goblin', 'wizard', 'skeleton', 'valkyrie', 'musketeer'];
      if (this.queue.find(p => p.socket.id === socket.id)) return;
      
      this.queue.push({ socket, deck });
      socket.emit('queue_status', { status: 'waiting', players: this.queue.length });

      if (this.queue.length >= 2) {
        const p1 = this.queue.shift()!;
        const p2 = this.queue.shift()!;
        
        const roomId = Math.random().toString(36).substring(7);
        p1.socket.join(roomId);
        p2.socket.join(roomId);
        
        const room = new GameRoom(roomId, p1.socket, p2.socket, this.io, p1.deck, p2.deck);
        this.rooms.set(roomId, room);
        
        p1.socket.emit('match_found', { roomId, opponent: p2.socket.id, isP1: true });
        p2.socket.emit('match_found', { roomId, opponent: p1.socket.id, isP1: false });
      }
    });

    socket.on('join_bot_match', (payload?: { deck: string[] }) => {
      const deck = payload?.deck?.length === 8 ? payload.deck : ['knight', 'archer', 'giant', 'goblin', 'wizard', 'skeleton', 'valkyrie', 'musketeer'];
      // Remove from normal queue if they were in it
      this.queue = this.queue.filter(p => p.socket.id !== socket.id);

      const roomId = 'bot_' + Math.random().toString(36).substring(7);
      const botId = 'bot_player';
      
      socket.join(roomId);
      
      // Create a mock socket for the bot
      const mockBotSocket = {
        id: botId,
        on: () => {},
        emit: () => {},
        join: () => {},
        leave: () => {}
      } as any as Socket;

      // Bot uses a random deck or the same deck
      const botDeck = ['knight', 'archer', 'giant', 'goblin', 'wizard', 'skeleton', 'valkyrie', 'musketeer'];

      const room = new GameRoom(roomId, socket, mockBotSocket, this.io, deck, botDeck);
      this.rooms.set(roomId, room);
      
      socket.emit('match_found', { roomId, opponent: botId, isP1: true });
    });

    socket.on('disconnect', () => {
      this.queue = this.queue.filter(p => p.socket.id !== socket.id);
    });
  }
}
