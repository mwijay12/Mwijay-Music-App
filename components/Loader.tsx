
import React from 'react';
import styled from 'styled-components';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text = "Loading" }) => {
  const letters = text.split("");

  return (
    <StyledWrapper>
      <div className="loader-wrapper">
        {letters.map((letter, index) => (
          <span key={index} className="loader-letter" style={{ animationDelay: `${0.1 * (index + 1)}s` }}>
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}
        <div className="loader" />
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    width: auto;
    margin: 2rem;

    font-family: "Inter", sans-serif;
    font-size: 1.6em;
    font-weight: 800;
    user-select: none;
    color: white;

    scale: 1.5;
  }

  .loader {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 1;

    background-color: transparent;
    mask: repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent 6px,
      black 6px,
      black 9px
    );
  }

  .loader::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    background-image: radial-gradient(circle at 50% 50%, #ff0 0%, transparent 50%),
      radial-gradient(circle at 45% 45%, #f00 0%, transparent 45%),
      radial-gradient(circle at 55% 55%, #0ff 0%, transparent 45%),
      radial-gradient(circle at 45% 55%, #0f0 0%, transparent 45%),
      radial-gradient(circle at 55% 45%, #00f 0%, transparent 45%);
    mask: radial-gradient(
      circle at 50% 50%,
      transparent 0%,
      transparent 10%,
      black 25%
    );
    animation:
      transform-animation 2s infinite alternate,
      opacity-animation 4s infinite;
    animation-timing-function: cubic-bezier(0.6, 0.8, 0.5, 1);
  }

  @keyframes transform-animation {
    0% {
      transform: translate(-55%);
    }
    100% {
      transform: translate(55%);
    }
  }

  @keyframes opacity-animation {
    0%,
    100% {
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    65% {
      opacity: 0;
    }
  }

  .loader-letter {
    display: inline-block;
    opacity: 0;
    animation: loader-letter-anim 4s infinite linear;
    z-index: 2;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  @keyframes loader-letter-anim {
    0% {
      filter: blur(0px);
      opacity: 0;
    }
    5% {
      opacity: 1;
      text-shadow: 0 0 8px rgba(255,255,255,0.5);
      filter: blur(0px);
      transform: scale(1.1) translateY(-2px);
    }
    20% {
      opacity: 0.2;
      filter: blur(0px);
    }
    100% {
      filter: blur(5px);
      opacity: 0;
    }
  }
`;

export default Loader;
