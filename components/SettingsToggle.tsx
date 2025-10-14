
interface SettingsToggleProps {
    label: string;
    description?: string;
    isChecked?: boolean;
    onToggle?: () => void;
}

const SettingsToggle = ({ label, description, isChecked = false, onToggle = () => {} }: SettingsToggleProps) => (
    <div className="flex items-center justify-between bg-[var(--surface-color)] p-3 rounded-lg">
        <div>
            <p className="font-bold">{label}</p>
            {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
        </div>
        <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={isChecked} onChange={onToggle} />
            <div className="relative w-11 h-6 bg-gray-600 rounded-full toggle-bg"></div>
        </label>
    </div>
);

export default SettingsToggle;