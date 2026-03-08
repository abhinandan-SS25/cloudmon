/* ═══════════════════════════════════════════════════════════════
   App.tsx – CloudMon Application Shell
   Header removed — each page hosts its own floating nav/dock.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
// @ts-ignore
import './App.css';
import { ProjectsProvider } from './context/ProjectsContext';
import LandingPage       from './pages/LandingPage';
import NodeDetailPage    from './pages/NodeDetailPage';
import ProjectEditorPage from './pages/ProjectEditorPage';
import ProjectsPage      from './pages/ProjectsPage';

function App() {
  return (
    <ProjectsProvider>
      <div className="App">
        <main className="app-main">
          <Routes>
            <Route path="/"          element={<LandingPage />} />
            <Route path="/projects"  element={<ProjectsPage />} />
            <Route path="/projects/:projectId"
                   element={<ProjectEditorPage />} />
            <Route path="/projects/:projectId/requests/:requestId"
                   element={<ProjectEditorPage />} />
            <Route path="/projects/:projectId/nodes/:nodeId"
                   element={<NodeDetailPage />} />
            <Route path="/projects/:projectId/requests/:requestId/nodes/:nodeId"
                   element={<NodeDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ProjectsProvider>
  );
}

export default App;
