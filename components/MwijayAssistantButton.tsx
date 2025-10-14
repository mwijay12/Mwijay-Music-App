import React from 'react';

interface MwijayAssistantButtonProps {
  onClick: () => void;
  isOpening?: boolean;
}

const MwijayAssistantButton: React.FC<MwijayAssistantButtonProps> = ({ onClick, isOpening }) => {
  return (
    <div className="mwijay-assistant-button-wrapper">
      <button className={`button ${isOpening ? 'is-opening' : ''}`} onClick={onClick}>
        <div className="outline" />
        <div className="state state--default">
          <div className="icon">
             <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" height="1.4em" width="1.4em">
                <g style={{filter: 'url(#shadow)'}}>
                    <path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 3.4 8.1 7.7 8.8v.2H11v-2h2v2h1.3v-.2c4.3-.7 7.7-4.4 7.7-8.8C22 6.5 17.5 2 12 2zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </g>
                <defs>
                    <filter id="shadow">
                        <feDropShadow floodOpacity="0.6" stdDeviation="0.8" dy={1} dx={0} />
                    </filter>
                </defs>
            </svg>
          </div>
          <p>
            <span style={{'--i': 0} as React.CSSProperties}>M</span>
            <span style={{'--i': 1} as React.CSSProperties}>w</span>
            <span style={{'--i': 2} as React.CSSProperties}>i</span>
            <span style={{'--i': 3} as React.CSSProperties}>j</span>
            <span style={{'--i': 4} as React.CSSProperties}>a</span>
            <span style={{'--i': 5} as React.CSSProperties}>y</span>
            <span style={{'--i': 6} as React.CSSProperties}>&nbsp;</span>
            <span style={{'--i': 7} as React.CSSProperties}>A</span>
            <span style={{'--i': 8} as React.CSSProperties}>s</span>
            <span style={{'--i': 9} as React.CSSProperties}>s</span>
            <span style={{'--i': 10} as React.CSSProperties}>i</span>
            <span style={{'--i': 11} as React.CSSProperties}>s</span>
            <span style={{'--i': 12} as React.CSSProperties}>t</span>
            <span style={{'--i': 13} as React.CSSProperties}>a</span>
            <span style={{'--i': 14} as React.CSSProperties}>n</span>
            <span style={{'--i': 15} as React.CSSProperties}>t</span>
          </p>
        </div>
        <div className="state state--sent">
          <div className="icon">
            <svg stroke="currentColor" strokeWidth="0.5px" width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g style={{filter: 'url(#shadow)'}}>
                <path d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z" fill="currentColor" />
                <path d="M10.5795 15.5801C10.3795 15.5801 10.1895 15.5001 10.0495 15.3601L7.21945 12.5301C6.92945 12.2401 6.92945 11.7601 7.21945 11.4701C7.50945 11.1801 7.98945 11.1801 8.27945 11.4701L10.5795 13.7701L15.7195 8.6301C16.0095 8.3401 16.4895 8.3401 16.7795 8.6301C17.0695 8.9201 17.0695 9.4001 16.7795 9.6901L11.1095 15.3601C10.9695 15.5001 10.7795 15.5801 10.5795 15.5801Z" fill="currentColor" />
              </g>
            </svg>
          </div>
          <p>
            <span style={{'--i': 0} as React.CSSProperties}>O</span>
            <span style={{'--i': 1} as React.CSSProperties}>p</span>
            <span style={{'--i': 2} as React.CSSProperties}>e</span>
            <span style={{'--i': 3} as React.CSSProperties}>n</span>
            <span style={{'--i': 4} as React.CSSProperties}>i</span>
            <span style={{'--i': 5} as React.CSSProperties}>n</span>
            <span style={{'--i': 6} as React.CSSProperties}>g</span>
            <span style={{'--i': 7} as React.CSSProperties}>!</span>
          </p>
        </div>
      </button>
    </div>
  );
}

export default MwijayAssistantButton;