import React, { useState, useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface NotificationProps {
    message: string;
    type: 'success' | 'info' | 'error';
    icon?: React.ReactNode;
}

const Notification: React.FC<NotificationProps> = ({ message, type, icon }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2800);

        return () => clearTimeout(timer);
    }, [message, type, icon]); // Re-trigger animation on new message

    const typeClasses = {
        success: { bg: 'bg-green-500/20', text: 'text-green-300', icon: <CheckCircle2 size={18} /> },
        info: { bg: 'bg-blue-500/20', text: 'text-blue-300', icon: <Info size={18} /> },
        error: { bg: 'bg-red-500/20', text: 'text-red-300', icon: <AlertTriangle size={18} /> },
    };

    const finalIcon = icon || typeClasses[type].icon;

    return (
        <div 
            className={`fixed left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[500] transition-all duration-500 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
            style={{ top: 'calc(env(safe-area-inset-top, 0rem) + 7.5rem)' }}
        >
            <div className="liquid-glass-pane rounded-full p-2 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeClasses[type].bg} ${typeClasses[type].text}`}>
                    {finalIcon}
                </div>
                <p className="text-sm font-medium text-white truncate">{message}</p>
            </div>
        </div>
    );
};

export default Notification;