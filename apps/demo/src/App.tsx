import React from "react";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import FeatureCard from "./components/FeatureCard";

const BoltIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "#38bdf8" }}
  >
    <polygon
      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      fill="currentColor"
      fillOpacity="0.2"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "#38bdf8" }}
  >
    <path
      d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
      fill="currentColor"
      fillOpacity="0.2"
    />
  </svg>
);

const CheckmarkSealIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "#10b981" }}
  >
    <path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

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
            icon={<BoltIcon />}
          />
          <FeatureCard
            title="MCP native"
            description="Works with Claude Code, Cursor, Windsurf."
            icon={<SparklesIcon />}
          />
          <FeatureCard
            title="MIT licensed"
            description="Use it in any project, commercial or not."
            icon={<CheckmarkSealIcon />}
          />
        </section>
      </main>
    </div>
  );
}
