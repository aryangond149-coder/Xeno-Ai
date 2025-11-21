import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartupScreenProps {
  onComplete: () => void;
}

const StartupScreen: React.FC<StartupScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 1800),
      setTimeout(() => onComplete(), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const messages = [
    "🧠 Initializing Xeno Core...",
    "🌐 Activating Neural Link...",
    "💫 Welcome to Xeno AI",
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#3B0A94] to-[#0D0221] text-white">
      <div className="w-full max-w-md px-8 text-center">
        <AnimatePresence mode='wait'>
          <motion.h1
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-2xl font-poppins font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00E0FF] to-white mb-8 h-16"
          >
            {messages[step] || messages[2]}
          </motion.h1>
        </AnimatePresence>

        <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div 
                className="absolute top-0 left-0 h-full bg-[#00E0FF] shadow-[0_0_10px_#00E0FF]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.8, ease: "easeInOut" }}
            />
        </div>
      </div>
    </div>
  );
};

export default StartupScreen;