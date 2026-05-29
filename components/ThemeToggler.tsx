import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeTogglerProps {
  checked: boolean;
  onChange: () => void;
}

const ThemeToggler: React.FC<ThemeTogglerProps> = ({ checked, onChange }) => {
  return (
    <label className="theme-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="theme-slider">
        <Sun size={14} className="sun" />
        <Moon size={14} className="moon" />
      </span>
    </label>
  );
}

export default ThemeToggler;