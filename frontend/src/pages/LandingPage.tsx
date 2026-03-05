/* ═══════════════════════════════════════════════════════════════
   LandingPage.tsx
   ═══════════════════════════════════════════════════════════════ */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import CloudmonSVG from '../components/svg/CloudmonSVG';
import { GrSecure } from "react-icons/gr";
import { FaLinux } from "react-icons/fa";
import { FaShareNodes } from "react-icons/fa6";
import { MdOutlineStorage } from "react-icons/md";

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
      // Fully deleted – move to next phrase
      timeout.current = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIdx((i) => (i + 1) % phrases.length);
      }, NEXT_PAUSE);
    } else {
      // Update characters beign displayed
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
          <h2 className="hero-subline">Considering distributing your architecture?</h2>
          <h2 className="hero-subline">Comparing AWS EC2 to Azure VMs?</h2>
          <h2 className="hero-subline">Wondering how many users you can handle?</h2>
          <p className="hero-paragraph">
            Back-of-the-envelope estimations and gut feelings have steered architecture for years. CloudMon gives you a visual, quantitative lens: see bottlenecks, simulate load, and weigh cost across clouds.
          </p>
          <div className="lp-symbol-row" aria-hidden="true">
            <span><FaLinux /></span>
            <span><FaShareNodes /></span>
            <span><MdOutlineStorage /></span>
            <span><GrSecure /></span>
          </div>
          <button className="btn-primary" onClick={handleStart}>
            Create a project
          </button>
        </div>
        <div className="hero-visual">
          <div className="lp-visual-card">
            <CloudmonSVG />
          </div>
        </div>
      </div>
    </div>

  );
}
