import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <nav>
        <span className="logo">Pointr</span>
        <button className="cta-button" onClick={() => alert('Clicked!')}>
          Get Started
        </button>
      </nav>
    </header>
  );
}
