import React from 'react';
import './index.scss';

export default function AnimatedLetters({ text, className = '', delay = 0 }) {
  return (
    <span className={`animated-letters ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="letter"
          style={{ animationDelay: `${delay + i * 0.05}s` }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  );
}