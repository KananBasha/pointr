import React from 'react';

export default function HeroSection() {
  return (
    <section className="hero">
      <h1 className="hero-title">Point at anything in your UI.</h1>
      <p className="hero-subtitle">Your AI agent knows exactly what you mean.</p>
      <div className="hero-actions">
        <button className="primary-button">Install Pointr</button>
        <a href="#docs" className="secondary-link">Read docs →</a>
      </div>
    </section>
  );
}
