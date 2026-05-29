
import React from 'react';

interface BubbleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  disabled?: boolean;
}

const BubbleButton: React.FC<BubbleButtonProps> = ({ children, onClick, className, style, title, disabled }) => {
  return (
    <button 
        className={`bubble-button ${className || ''}`} 
        onClick={onClick} 
        style={style} 
        title={title}
        disabled={disabled}
    >
        <div className="bubble-layer bubble-1" />
        <div className="bubble-layer bubble-2" />
        <div className="bubble-layer bubble-3" />
        <div className="bubble-layer bubble-4" />
        <div className="bubble-layer bubble-5" />
        <div className="bubble-layer bubble-6" />
        <div className="bubble-layer bubble-7" />
        <span>{children}</span>
    </button>
  );
}

export default BubbleButton;
