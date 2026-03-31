'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface CodexMistProps {
  isActive: boolean;
  variant?: 'light' | 'aqueous' | 'deep';
  onComplete: () => void;
}

const VARIANTS = {
  light: {
    layers: [
      { className: 'codex-mist-layer-1', delay: 0 },
      { className: 'codex-mist-layer-3', delay: 0.15 },
    ],
    duration: 1.2,
  },
  aqueous: {
    layers: [
      { className: 'codex-mist-layer-2', delay: 0 },
      { className: 'codex-mist-layer-aqueous', delay: 0.1 },
      { className: 'codex-mist-layer-1', delay: 0.2 },
    ],
    duration: 1.8,
  },
  deep: {
    layers: [
      { className: 'codex-mist-layer-1', delay: 0 },
      { className: 'codex-mist-layer-2', delay: 0.1 },
      { className: 'codex-mist-layer-3', delay: 0.2 },
      { className: 'codex-mist-layer-aqueous', delay: 0.3 },
    ],
    duration: 2.2,
  },
};

export function CodexMist({ isActive, variant = 'light', onComplete }: CodexMistProps) {
  const config = VARIANTS[variant];

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="codex-mist-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={(definition) => {
            // Only call onComplete when the exit animation finishes
            if (definition === 'exit' || (typeof definition === 'object' && 'opacity' in definition && definition.opacity === 0)) {
              return;
            }
            // Schedule the fade-out after hold time
            setTimeout(onComplete, config.duration * 500);
          }}
        >
          {config.layers.map((layer, i) => (
            <motion.div
              key={i}
              className={`codex-mist-layer ${layer.className}`}
              initial={{
                opacity: 0,
                x: i % 2 === 0 ? '-10%' : '10%',
                scale: 1.1,
              }}
              animate={{
                opacity: [0, 0.8, 0.9, 0.6, 0],
                x: [i % 2 === 0 ? '-10%' : '10%', '0%', i % 2 === 0 ? '5%' : '-5%'],
                scale: [1.1, 1.0, 1.05],
              }}
              transition={{
                duration: config.duration,
                delay: layer.delay,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
