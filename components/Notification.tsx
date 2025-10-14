
import React, { useState, useEffect } from 'react';

interface NotificationProps {
    message: string;
    type: 'success' | 'info' | 'error';
    icon?: string;
}

const Notification: React.FC<NotificationProps> = ({ message, type, icon }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2800); // Should be slightly less than the timeout in App.tsx

        return () => clearTimeout(timer);
    }, [message]);

    const baseClasses = "fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-bold shadow-lg transition-all duration-300 z-[100] flex items-center";
    const visibilityClasses = isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0';
    
    const typeClasses = {
        success: "bg-green-500 text-white",
        info: "bg-blue-500 text-white",
        error: "bg-red-500 text-white",
    };

    const defaultIconClasses = {
        success: "fas fa-check-circle",
        info: "fas fa-info-circle",
        error: "fas fa-exclamation-circle",
    };
    
    const finalIconClass = icon ? `fas ${icon}` : defaultIconClasses[type];

    return (
        <div className={`${baseClasses} ${visibilityClasses} ${typeClasses[type]}`}>
            <i className={`${finalIconClass} mr-2`}></i>
            {message}
        </div>
    );
};

export default Notification;
