import { Swords, Bot } from 'lucide-react';
import { motion } from 'motion/react';

export function Menu({ onPlay, onPlayBot }: { onPlay: () => void, onPlayBot: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-8"
    >
      <div className="text-center">
        <motion.h1 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-600 drop-shadow-lg"
        >
          ROYALE JS
        </motion.h1>
        <p className="text-zinc-400 mt-2 font-medium">Real-time Multiplayer Battle</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlay}
          className="group relative px-8 py-4 w-full bg-blue-600 hover:bg-blue-500 transition-all rounded-2xl font-bold text-xl shadow-[0_8px_0_rgb(37,99,235)] hover:shadow-[0_4px_0_rgb(37,99,235)] hover:translate-y-1 active:shadow-none active:translate-y-2 flex items-center justify-center gap-3"
        >
          <Swords className="w-6 h-6" />
          PVP BATTLE
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayBot}
          className="group relative px-8 py-4 w-full bg-purple-600 hover:bg-purple-500 transition-all rounded-2xl font-bold text-xl shadow-[0_8px_0_rgb(147,51,234)] hover:shadow-[0_4px_0_rgb(147,51,234)] hover:translate-y-1 active:shadow-none active:translate-y-2 flex items-center justify-center gap-3"
        >
          <Bot className="w-6 h-6" />
          VS BOT (AI)
        </motion.button>
      </div>
    </motion.div>
  );
}
