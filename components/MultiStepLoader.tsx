"use client";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

type LoadingState = {
  text: string;
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 1000,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
}) => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1 >= loadingStates.length ? prev : prev + 1));
    }, duration);

    return () => clearInterval(interval);
  }, [loading, duration, loadingStates.length]);

  if (!loading) {
    return null;
  }

  return (
    <div className="w-full h-full fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-color)]/80 backdrop-blur-xl">
      <div className="h-96 relative flex flex-col items-center justify-center text-center">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } }}
            className="mb-12 font-poppins"
        >
            <h1 className="text-2xl text-white/80">Welcome to</h1>
            <h1 className="text-4xl font-bold text-[var(--primary-accent)]">Mwijay Music</h1>
        </motion.div>

        <div className="w-40 h-40">
            <div className="w-full h-full relative">
                <div
                    className="w-full h-full rounded-full"
                    style={{
                        background: 'conic-gradient(from 0deg, var(--bg-color), var(--primary-accent), var(--secondary-accent-start), var(--secondary-accent-end), var(--bg-color))',
                        animation: 'spin 2s linear infinite',
                    }}
                />
                <div className="absolute inset-[3px] bg-[var(--bg-color)] rounded-full flex items-center justify-center">
                    <div
                        className="w-32 h-32 rounded-full loader-pulse"
                        style={{
                            background: 'conic-gradient(from 180deg, var(--bg-color), var(--secondary-accent-start), var(--bg-color))',
                            animationDirection: 'reverse',
                        }}
                    />
                </div>
            </div>
        </div>

        <div className="text-center mt-8 h-16">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentState}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              className="text-xl md:text-2xl font-bold text-white relative z-20"
            >
              {loadingStates[currentState].text}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {loadingStates.map((_, index) => (
            <div
              key={`dot-${index}`}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${index <= currentState ? 'bg-[var(--primary-accent)] scale-110' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
