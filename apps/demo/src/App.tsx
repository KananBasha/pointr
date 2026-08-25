import React from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeatureCard from './components/FeatureCard';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <HeroSection />
        <section className="features">
          <FeatureCard
            title="Zero config"
            description="Install the plugin. That's it."
            icon="⚡"
          />
          <FeatureCard
            title="MCP native"
            description="Works with Claude Code, Cursor, Windsurf."
            icon="🤖"
          />
          <FeatureCard
            title="MIT licensed"
            description="Use it in any project, commercial or not."
            icon="✅"
          />
        </section>
      </main>
    </div>
  );
}
