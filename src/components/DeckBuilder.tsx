import React, { useState, useEffect } from 'react';
import { CARDS } from '../shared/constants';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface DeckBuilderProps {
  onConfirm: (deck: string[]) => void;
  onCancel: () => void;
}

export function DeckBuilder({ onConfirm, onCancel }: DeckBuilderProps) {
  const [deck, setDeck] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('royale_deck');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 8) {
          setDeck(parsed);
          return;
        }
      } catch (e) {}
    }
    // Default deck if none saved
    setDeck(['knight', 'archer', 'giant', 'goblin', 'wizard', 'skeleton', 'valkyrie', 'musketeer']);
  }, []);

  const toggleCard = (cardId: string) => {
    if (deck.includes(cardId)) {
      setDeck(deck.filter(id => id !== cardId));
    } else if (deck.length < 8) {
      setDeck([...deck, cardId]);
    }
  };

  const handleConfirm = () => {
    if (deck.length === 8) {
      localStorage.setItem('royale_deck', JSON.stringify(deck));
      onConfirm(deck);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center bg-zinc-900 p-6 rounded-2xl shadow-2xl max-w-2xl w-full border border-zinc-700"
    >
      <h2 className="text-3xl font-black text-yellow-400 mb-2 drop-shadow-md">DECK BUILDER</h2>
      <p className="text-zinc-400 mb-6">Select 8 cards for your battle deck ({deck.length}/8)</p>

      {/* Current Deck */}
      <div className="w-full mb-8">
        <h3 className="text-xl font-bold text-white mb-3 border-b border-zinc-700 pb-2">Your Deck</h3>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => {
            const cardId = deck[i];
            const card = cardId ? CARDS[cardId] : null;

            return (
              <div 
                key={`slot-${i}`}
                onClick={() => cardId && toggleCard(cardId)}
                className={clsx(
                  "aspect-[5/6] rounded-sm border-2 flex flex-col items-center justify-center relative transition-all overflow-hidden",
                  card ? "border-zinc-500 bg-zinc-300 cursor-pointer hover:-translate-y-1 shadow-lg" : "border-dashed border-zinc-600 bg-zinc-800/50"
                )}
              >
                {card && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-200 to-blue-400"></div>
                    <div className="absolute top-0 left-0 bg-fuchsia-600 text-white text-[10px] font-black w-5 h-6 flex items-center justify-center shadow-md border-r border-b border-fuchsia-300 z-10" style={{ borderBottomRightRadius: '50%', borderBottomLeftRadius: '50%', borderTopRightRadius: '50%' }}>
                      {card.cost}
                    </div>
                    <img 
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${card.name}&backgroundColor=transparent`} 
                      alt={card.name}
                      className="w-full h-full object-cover absolute top-2 scale-125"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="text-4xl mb-1 drop-shadow-md hidden z-10 relative">{card.emoji}</div>
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-1 z-10">
                      <span className="font-bold text-[9px] text-white uppercase tracking-wider block text-center" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>{card.name}</span>
                    </div>
                    <div className="absolute inset-0 border-4 border-zinc-400/50 rounded-sm pointer-events-none z-20"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Cards */}
      <div className="w-full">
        <h3 className="text-xl font-bold text-white mb-3 border-b border-zinc-700 pb-2">Available Cards</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[40vh] overflow-y-auto pr-2 pb-4 custom-scrollbar">
          {Object.values(CARDS).map(card => {
            const isSelected = deck.includes(card.id);
            return (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                className={clsx(
                  "relative aspect-[5/6] rounded-sm border-2 transition-all overflow-hidden flex flex-col items-center justify-center bg-zinc-300",
                  isSelected ? "border-zinc-500 opacity-50 grayscale" : "border-zinc-500 hover:-translate-y-1 shadow-md"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-200 to-blue-400"></div>
                <div className="absolute top-0 left-0 bg-fuchsia-600 text-white text-[10px] font-black w-5 h-6 flex items-center justify-center shadow-md border-r border-b border-fuchsia-300 z-10" style={{ borderBottomRightRadius: '50%', borderBottomLeftRadius: '50%', borderTopRightRadius: '50%' }}>
                  {card.cost}
                </div>
                <img 
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${card.name}&backgroundColor=transparent`} 
                  alt={card.name}
                  className="w-full h-full object-cover absolute top-2 scale-125"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="text-3xl mb-1 drop-shadow-md hidden z-10 relative">{card.emoji}</div>
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-1 z-10">
                  <span className="font-bold text-[9px] text-white uppercase tracking-wider block text-center" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>{card.name}</span>
                </div>
                <div className="absolute inset-0 border-4 border-zinc-400/50 rounded-sm pointer-events-none z-20"></div>
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
                    <span className="text-white font-bold text-xl drop-shadow-md">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 mt-8 w-full">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-bold text-lg bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleConfirm}
          disabled={deck.length !== 8}
          className={clsx(
            "flex-1 py-3 rounded-xl font-bold text-lg transition-colors",
            deck.length === 8 ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          BATTLE
        </button>
      </div>
    </motion.div>
  );
}
