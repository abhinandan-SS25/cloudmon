/* ═══════════════════════════════════════════════════════════════
   LandingPage.tsx
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import CloudmonSVG from '../components/CloudmonSVG';

export default function LandingPage() {
  const navigate = useNavigate();
  const { createNewProject } = useProjects();

  function handleStart() {
    const project = createNewProject();
    navigate(`/projects/${project.id}`);
  }

  return (
    <div className="page landing">
      <div className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">CloudMon</span>
          <h1>Visualize your architecture.</h1> 
          <h1>See the impact of your design.</h1>
          <h1>1-click deploy on cloud or local.</h1>
          <h3>Considering dsitributing architecture?</h3>
          <h3>Considering using AWS EC2 instead of Azure VMs?</h3>
          <h3>Wondering how many users you can handle?</h3>
          <p>
            There have always been back-of-the-envolope estimations and intuitions that drive architecture design. 
            But now, you can actually visualize your architecture and estiamte the traffic it can handle, what bottlenecks you have, what the estimated cost might be.
          </p>
          <button className="btn-primary" onClick={handleStart}>
            Create a project
          </button>
        </div>
        <div className="panel-card">
          <CloudmonSVG />
        </div>
      </div>
    </div>

  );
}
