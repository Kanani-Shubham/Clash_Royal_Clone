import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { GameState } from './shared/types';
import { Arena } from './components/Arena';
import { Menu } from './components/Menu';
import { DeckBuilder } from './components/DeckBuilder';
import { GeminiBotClient } from './client/GeminiBot';

const socket = io();

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<'menu' | 'deck' | 'waiting' | 'playing' | 'ended'>('menu');
  const [matchType, setMatchType] = useState<'pvp' | 'bot' | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [isP1, setIsP1] = useState(true);
  const botRef = useRef<GeminiBotClient | null>(null);

  useEffect(() => {
    socket.on('connect', () => {
      setPlayerId(socket.id!);
    });

    socket.on('queue_status', ({ status }) => {
      setStatus(status);
    });

    socket.on('match_found', ({ isP1, opponent }) => {
      setIsP1(isP1);
      setStatus('playing');
      
      if (opponent === 'bot_player') {
        botRef.current = new GeminiBotClient(opponent, socket);
        botRef.current.start();
      }
    });

    socket.on('match_start', (state: GameState) => {
      setGameState(state);
      if (botRef.current) botRef.current.updateState(state);
    });

    socket.on('sync', (state: GameState) => {
      setGameState(state);
      if (botRef.current) botRef.current.updateState(state);
    });

    socket.on('game_over', (state: GameState) => {
      setGameState(state);
      setStatus('ended');
      if (botRef.current) {
        botRef.current.stop();
        botRef.current = null;
      }
    });

    return () => {
      socket.off('connect');
      socket.off('queue_status');
      socket.off('match_found');
      socket.off('match_start');
      socket.off('sync');
      socket.off('game_over');
      if (botRef.current) {
        botRef.current.stop();
      }
    };
  }, []);

  const handlePlayClick = (type: 'pvp' | 'bot') => {
    setMatchType(type);
    setStatus('deck');
  };

  const handleDeckConfirm = (deck: string[]) => {
    if (matchType === 'pvp') {
      socket.emit('join_queue', { deck });
    } else {
      socket.emit('join_bot_match', { deck });
    }
    setStatus('waiting');
  };

  const playCard = (cardId: string, x: number, y: number) => {
    socket.emit('play_card', { cardId, x, y });
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center font-sans">
      {status === 'menu' && <Menu onPlay={() => handlePlayClick('pvp')} onPlayBot={() => handlePlayClick('bot')} />}
      {status === 'deck' && <DeckBuilder onConfirm={handleDeckConfirm} onCancel={() => setStatus('menu')} />}
      {status === 'waiting' && (
        <div className="text-2xl animate-pulse font-bold text-yellow-400">Searching for opponent...</div>
      )}
      {(status === 'playing' || status === 'ended') && gameState && (
        <Arena 
          state={gameState} 
          playerId={playerId} 
          isP1={isP1} 
          onPlayCard={playCard} 
        />
      )}
    </div>
  );
}

