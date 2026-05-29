
import React from 'react';

interface SettingsToggleProps {
    label: string;
    description?: string;
    isChecked?: boolean;
    onToggle?: () => void;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ label, description, isChecked = false, onToggle = () => {} }) => {
    return (
        <div className="liquid-glass-pane glare-effect flex items-start justify-between p-3 rounded-lg gap-4">
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--text-primary)]">{label}</p>
                {description && <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>}
            </div>
            <div className="flex-shrink-0">
                <label className="switch-toggle">
                    <input type="checkbox" checked={isChecked} onChange={onToggle} />
                    <span className="slider" />
                </label>
            </div>
        </div>
    );
}

export default SettingsToggle;
