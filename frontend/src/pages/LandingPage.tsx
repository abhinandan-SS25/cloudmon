/* ═══════════════════════════════════════════════════════════════
   LandingPage.tsx
   ═══════════════════════════════════════════════════════════════ */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';

const PHRASES = [
  'Visualize your architecture.',
  'See the impact of your design.',
  '1-click deploy on cloud or local.',
];

const TYPE_SPEED   = 48;   // ms per character typed
const DELETE_SPEED = 22;   // ms per character deleted
const HOLD_PAUSE   = 1800; // ms to hold the full phrase
const NEXT_PAUSE   = 320;  // ms pause before typing next phrase

function useTypewriter(phrases: string[]) {
  const [display, setDisplay]       = useState('');
  const [phraseIdx, setPhraseIdx]   = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = phrases[phraseIdx];

    if (!isDeleting && display === current) {
      // Fully typed – hold then start deleting
      timeout.current = setTimeout(() => setIsDeleting(true), HOLD_PAUSE);
    } else if (isDeleting && display === '') {
      // Fully deleted – move to next phrase (batch both updates so no intermediate render)
      timeout.current = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIdx((i) => (i + 1) % phrases.length);
      }, NEXT_PAUSE);
    } else {
      const next = isDeleting
        ? current.slice(0, display.length - 1)
        : current.slice(0, display.length + 1);
      timeout.current = setTimeout(
        () => setDisplay(next),
        isDeleting ? DELETE_SPEED : TYPE_SPEED
      );
    }
    

    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [display, isDeleting, phraseIdx, phrases]);

  return display;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { createNewProject } = useProjects();
  const heroText = useTypewriter(PHRASES);

  function handleStart() {
    const project = createNewProject();
    navigate(`/projects/${project.id}`);
  }

  return (
    <div className="page landing">
      <div className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">CloudMon</span>
          <h1 className="typewriter-h1">
            {heroText}<span className="typewriter-cursor" aria-hidden="true" />
          </h1>
          <h2>Considering dsitributing architecture?</h2>
          <h2>Considering using AWS EC2 instead of Azure VMs?</h2>
          <h2>Wondering how many users you can handle?</h2>
          <p>
            Back-of-the-envolope estimations and intuitions have drive architecture design for a long time. 
            But now, you can actually visualize your architecture and estimate the traffic it can handle, what the bottlenecks are, what the cost might be.
          </p>
          <button className="btn-primary" onClick={handleStart}>
            Create a project
          </button>
        </div>
        <div className="panel-card lp-preview-panel">
          <div className="lp-preview-header">
            <span className="lp-preview-badge">CloudMon</span>
            <span className="lp-preview-title">Architecture Studio</span>
          </div>

          <div className="lp-feature-list">
            <div className="lp-feature-item">
              <div className="lp-feature-icon">🗺️</div>
              <div className="lp-feature-text">
                <div className="lp-feature-name">Visual Designer</div>
                <div className="lp-feature-desc">Drag-and-drop 11 component types onto an infinite canvas</div>
              </div>
            </div>
            <div className="lp-feature-item">
              <div className="lp-feature-icon">⚡</div>
              <div className="lp-feature-text">
                <div className="lp-feature-name">Bottleneck Analysis</div>
                <div className="lp-feature-desc">Simulate traffic at scale and surface weak points instantly</div>
              </div>
            </div>
            <div className="lp-feature-item">
              <div className="lp-feature-icon">💰</div>
              <div className="lp-feature-text">
                <div className="lp-feature-name">Cost Estimation</div>
                <div className="lp-feature-desc">Compare AWS, GCP, and Azure pricing side-by-side</div>
              </div>
            </div>
            <div className="lp-feature-item">
              <div className="lp-feature-icon">🚀</div>
              <div className="lp-feature-text">
                <div className="lp-feature-name">One-Click Deploy</div>
                <div className="lp-feature-desc">Generate ready-to-use Terraform snippets for any node</div>
              </div>
            </div>
          </div>

          <div className="lp-stat-row">
            <div className="lp-stat">
              <span className="lp-stat-val">11</span>
              <span className="lp-stat-label">Component Types</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-val">3</span>
              <span className="lp-stat-label">Cloud Providers</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-val">∞</span>
              <span className="lp-stat-label">Scale Simulations</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
