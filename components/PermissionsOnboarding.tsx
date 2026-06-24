import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Bell, Camera, Mic, MapPin, CheckCircle, ArrowRight, X } from 'lucide-react';
import { permissions, PermissionType } from '../services/permissionsService';

interface PermissionsOnboardingProps {
  onComplete: () => void;
}

interface Step {
  id: PermissionType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  rational: string;
}

export const PermissionsOnboarding: React.FC<PermissionsOnboardingProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [grantedStates, setGrantedStates] = useState<Record<string, boolean>>({
    storage: false,
    notifications: false,
    camera: false,
    microphone: false,
    location: false,
  });
  const [loading, setLoading] = useState(false);

  const steps: Step[] = [
    {
      id: 'storage',
      title: 'Local Music Library',
      subtitle: 'Scan and play your offline songs',
      description: 'Mwijay scans your device directories recursively to build a premium offline library of your audio tracks.',
      icon: <Shield className="w-16 h-16 text-[var(--primary-accent)] drop-shadow-[0_0_15px_rgba(200,240,82,0.4)]" />,
      rational: 'Requires read access to your device files. No personal files are ever uploaded.',
    },
    {
      id: 'notifications',
      title: 'Dynamic Notifications',
      subtitle: 'Daily music wisdom and custom announcements',
      description: 'Receive morning zen quotes, developer announcements, offline music-sync notifications, and daily streaks.',
      icon: <Bell className="w-16 h-16 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />,
      rational: 'Requires notification authorization.',
    },
    {
      id: 'camera',
      title: 'Studio Camera',
      subtitle: 'Design stunning custom cover arts',
      description: 'Snap profile avatars or upload rich album cover arts dynamically from your camera roll or system photos.',
      icon: <Camera className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]" />,
      rational: 'Requires camera and photo gallery authorization.',
    },
    {
      id: 'microphone',
      title: 'Voice Companion',
      subtitle: 'Voice search, assistant analysis & karaoke',
      description: 'Interact with Mwijay using natural voice commands, analyze humming melodies, and record vocals.',
      icon: <Mic className="w-16 h-16 text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.4)]" />,
      rational: 'Requires microphone capture authorization.',
    },
    {
      id: 'location',
      title: 'Location Services',
      subtitle: 'Nearby concerts and live radio hubs',
      description: 'Discover regional music events, trending local playlists, and broadcast stations around you.',
      icon: <MapPin className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]" />,
      rational: 'Requires location authorization for matching local radios and events.',
    },
  ];

  useEffect(() => {
    const loadCurrentPermissions = async () => {
      try {
        const statuses = await permissions.checkAll();
        setGrantedStates({
          storage: statuses.storage.granted,
          notifications: statuses.notifications.granted,
          camera: statuses.camera.granted,
          microphone: statuses.microphone.granted,
          location: statuses.location.granted,
        });
      } catch (err) {
        console.warn('Failed to check permissions on mount:', err);
      }
    };
    loadCurrentPermissions();
  }, []);

  const currentStep = steps[currentStepIndex];

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const status = await permissions.request(currentStep.id);
      setGrantedStates((prev) => ({ ...prev, [currentStep.id]: status.granted }));
      
      // Delay slightly for visual feedback before auto-advancing
      setTimeout(() => {
        setLoading(false);
        handleNext();
      }, 800);
    } catch (e) {
      console.error('[PermissionsOnboarding] Request failed', e);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setGrantedStates((prev) => ({ ...prev, [currentStep.id]: false }));
    handleNext();
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Mark onboarding as completed in local storage
      localStorage.setItem('mwijay_permissions_onboarded', 'true');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] overflow-hidden select-none">
      {/* Floating abstract decorative background particles */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[var(--primary-accent)]/5 blur-[120px] top-10 left-10 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[150px] bottom-10 right-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md liquid-glass-pane glare-effect rounded-[36px] border border-white/10 p-8 text-white flex flex-col justify-between min-h-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] custom-scrollbar"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-accent)] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Permissions Setup</span>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('mwijay_permissions_onboarded', 'true');
              onComplete();
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
            title="Skip All Setup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Card Area */}
        <div className="flex-1 flex flex-col items-center text-center justify-center my-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Icon Circle Frame */}
              <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative">
                {currentStep.icon}
                {grantedStates[currentStep.id] && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-4 border-[#121214]"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </div>

              <h2 className="text-2xl font-black mb-1.5 tracking-tight">{currentStep.title}</h2>
              <h4 className="text-sm font-bold text-[var(--primary-accent)] mb-4">{currentStep.subtitle}</h4>
              <p className="text-sm text-neutral-300 leading-relaxed max-w-sm mb-6">
                {currentStep.description}
              </p>
              
              <div className="bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-xs text-neutral-400 max-w-xs font-medium leading-normal">
                💡 {currentStep.rational}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer controls & dots */}
        <div className="mt-8 flex flex-col gap-4 w-full">
          {/* Transition Dot Indicators */}
          <div className="flex justify-center gap-2 mb-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex ? 'w-6 bg-[var(--primary-accent)]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold py-3.5 px-6 rounded-2xl border border-white/5 transition-all text-sm disabled:opacity-40"
            >
              Skip
            </button>
            <button
              onClick={handleRequestPermission}
              disabled={loading}
              className="flex-[1.5] bg-[var(--primary-accent)] hover:bg-[var(--secondary-accent-start)] text-black font-extrabold py-3.5 px-6 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(200,240,82,0.25)] hover:shadow-[0_8px_20px_rgba(160,80,255,0.25)] disabled:opacity-75"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Grant Permission</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PermissionsOnboarding;
