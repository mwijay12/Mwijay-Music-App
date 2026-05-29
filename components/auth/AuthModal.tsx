import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SignIn } from './SignIn.tsx';
import { SignUp } from './SignUp.tsx';
import { ForgotPassword } from './ForgotPassword.tsx';

interface AuthModalProps {
  onClose: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  initialView?: 'signIn' | 'signUp';
  required?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  showNotification,
  initialView = 'signIn',
  required = false,
}) => {
  const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>(initialView);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring' as const, damping: 25, stiffness: 350 }
    },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={() => {
          if (!required) onClose();
        }}
      >
        <motion.div
          className="relative w-full max-w-md bg-gradient-to-b from-[#1a1a1a]/90 to-[#0d0d0d]/95 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {!required && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors z-20"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}

          {/* Subview Dispatcher */}
          <div className="flex-1 flex flex-col justify-center min-h-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                {view === 'signIn' && (
                  <SignIn
                    onSwitchToSignUp={() => setView('signUp')}
                    onSwitchToForgotPassword={() => setView('forgotPassword')}
                    onClose={onClose}
                    showNotification={showNotification}
                  />
                )}
                {view === 'signUp' && (
                  <SignUp
                    onSwitchToSignIn={() => setView('signIn')}
                    onClose={onClose}
                    showNotification={showNotification}
                  />
                )}
                {view === 'forgotPassword' && (
                  <ForgotPassword
                    onSwitchToSignIn={() => setView('signIn')}
                    showNotification={showNotification}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
export default AuthModal;
