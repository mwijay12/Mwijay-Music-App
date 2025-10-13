import React, { useState, useEffect } from 'react';

interface NotificationProps {
    message: string;
    type: 'success' | 'info' | 'error';
    icon?: string;
}

const Notification: React.FC<NotificationProps> = ({ message, type, icon }) => {
    const [status, setStatus] = useState('entering');

    useEffect(() => {
        const enterTimer = setTimeout(() => setStatus('entering'), 10);
        const exitTimer = setTimeout(() => {
            setStatus('exiting');
        }, 2800);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
        };
    }, [message, type]);

    const defaultIconClasses = {
        success: "fas fa-check-circle",
        info: "fas fa-info-circle",
        error: "fas fa-exclamation-circle",
    };
    
    const finalIconClass = icon ? `fas ${icon}` : defaultIconClasses[type];
    const iconColorClass = `icon-${type}`;

    return (
        <div className={`notification-toast ${status}`}>
            <i className={`${finalIconClass} ${iconColorClass}`}></i>
            <span>{message}</span>
        </div>
    );
};

export default Notification;