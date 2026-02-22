import React from 'react';

export default function CloudmonSVG() {
    return (
    <div className="w-[40vw] mx-auto rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-2xl p-4">
      <svg
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        <defs>
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <style>
            {`
              @keyframes slideFlow {
                to { stroke-dashoffset: -20; }
              }
              
              /* Monolith Disappear */
              @keyframes monolithFade {
                0%, 20% { opacity: 1; transform: scale(1); }
                40%, 100% { opacity: 0.1; transform: scale(0.85); }
              }

              /* Microservices Appear */
              @keyframes microservicePop {
                0%, 40% { opacity: 0; transform: scale(0.5); }
                60%, 100% { opacity: 1; transform: scale(1); }
              }

              /* Metrics Shift */
              @keyframes costDrop {
                0%, 40% { width: 400px; fill: #EF4444; }
                60%, 100% { width: 120px; fill: #10B981; }
              }
              @keyframes throughputRise {
                0%, 40% { width: 100px; }
                60%, 100% { width: 400px; }
              }

              .monolith { animation: monolithFade 8s ease-in-out infinite; transform-origin: 200px 220px; }
              .micro { animation: microservicePop 8s ease-in-out infinite; transform-origin: center; }
              .cost-bar { animation: costDrop 8s ease-in-out infinite; }
              .throughput-bar { animation: throughputRise 8s ease-in-out infinite; }
              
              .flow-path {
                stroke-dasharray: 5, 5;
                animation: slideFlow 1s linear infinite;
              }

              .label-text { font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 700; }
            `}
          </style>
        </defs>

        {/* Background Canvas */}
        <rect width="800" height="600" fill="#F8FAFC" />
        <g opacity="0.1" stroke="#787878" strokeWidth="1">
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={i} x1={i * 40} y1="0" x2={i * 40} y2="600" />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={i} y1={i * 40} x1="0" x2="800" y2={i * 40} />
          ))}
        </g>

        {/* =========================================
            TOP SECTION: ARCHITECTURE
            ========================================= */}
        
        {/* Gateway / Ingress */}
        <g transform="translate(40, 220)">
          <path d="M -10 0 L 20 0" stroke="#3B82F6" strokeWidth="2" className="flow-path" />
          <rect x="20" y="-40" width="50" height="80" rx="8" fill="white" stroke="#9b9b9b" strokeWidth="2" />
          <g transform="translate(30, -20)">
             <path d="M 0 5 L 30 5 M 0 20 L 30 20 M 0 35 L 30 35" stroke="#94A3B8" strokeWidth="2" />
          </g>
          <text x="45" y="55" textAnchor="middle" fill="#94A3B8" fontSize="8" className="label-text">GATEWAY</text>
          <path d="M 70 0 L 100 0" stroke="#3B82F6" strokeWidth="2" className="flow-path" />
        </g>

        {/* MONOLITH (Center Overlay) */}
        <g className="monolith">
          <rect x="140" y="120" width="140" height="200" rx="12" fill="white" stroke="#bd7171" strokeWidth="2" />
          <rect x="155" y="135" width="110" height="170" rx="6" fill="#F1F5F9" />
          <text x="210" y="215" textAnchor="middle" fill="#475569" fontSize="12" className="label-text">MONOLITHIC</text>
          <text x="210" y="230" textAnchor="middle" fill="#94A3B8" fontSize="10" className="label-text">API SERVER</text>
          <path d="M 280 220 L 520 220" stroke="#b7b7b7" strokeWidth="2" strokeDasharray="4 4" />
        </g>

        {/* MICROSERVICES (Scaling Group) */}
        <g transform="translate(380, 0)">
          <g className="micro" style={{ animationDelay: '0s' }}>
            <rect x="0" y="60" width="100" height="50" rx="10" fill="white" stroke="#10B981" strokeWidth="2" filter="url(#glow-green)" />
            <text x="50" y="90" textAnchor="middle" fill="#065F46" fontSize="9" className="label-text">AUTH SVC</text>
            <path d="M -240 220 Q -150 220 0 85" stroke="#10B981" strokeWidth="2" fill="none" className="flow-path" />
          </g>

          <g className="micro" style={{ animationDelay: '0.2s' }}>
            <rect x="0" y="140" width="100" height="50" rx="10" fill="white" stroke="#10B981" strokeWidth="2" filter="url(#glow-green)" />
            <text x="50" y="170" textAnchor="middle" fill="#065F46" fontSize="9" className="label-text">PAYMENT API</text>
            <path d="M -240 220 Q -150 220 0 165" stroke="#10B981" strokeWidth="2" fill="none" className="flow-path" />
          </g>

          <g className="micro" style={{ animationDelay: '0.4s' }}>
            <rect x="0" y="220" width="100" height="50" rx="10" fill="white" stroke="#10B981" strokeWidth="2" filter="url(#glow-green)" />
            <text x="50" y="250" textAnchor="middle" fill="#065F46" fontSize="9" className="label-text">SEARCH SVC</text>
            <path d="M -240 220 L 0 245" stroke="#10B981" strokeWidth="2" fill="none" className="flow-path" />
          </g>

          <g className="micro" style={{ animationDelay: '0.6s' }}>
            <rect x="0" y="300" width="100" height="50" rx="10" fill="white" stroke="#10B981" strokeWidth="2" filter="url(#glow-green)" />
            <text x="50" y="330" textAnchor="middle" fill="#065F46" fontSize="9" className="label-text">NOTIFS</text>
            <path d="M -240 220 Q -150 220 0 325" stroke="#10B981" strokeWidth="2" fill="none" className="flow-path" />
          </g>
        </g>

        {/* Egress (Storage Tier) */}
        <g transform="translate(620, 80)">
          <g transform="translate(0, 70)">
            <path d="M 0 15 Q 35 0 70 15 L 70 65 Q 35 80 0 65 Z" fill="white" stroke="#9b9b9b" strokeWidth="2" />
            <text x="35" y="45" textAnchor="middle" fill="#94A3B8" fontSize="9" className="label-text">CORE DB</text>
          </g>
          <g transform="translate(10, 0)">
            <rect width="50" height="40" rx="6" fill="white" stroke="#9b9b9b" strokeWidth="2" />
            <text x="25" y="25" textAnchor="middle" fill="#94A3B8" fontSize="8" className="label-text">CACHE</text>
          </g>
          <g transform="translate(10, 180)">
             <rect width="50" height="45" rx="4" fill="white" stroke="#9b9b9b" strokeWidth="2" />
             <text x="25" y="28" textAnchor="middle" fill="#94A3B8" fontSize="8" className="label-text">BLOB</text>
          </g>
          <g opacity="0.5" stroke="#7c7c7c" strokeWidth="1" fill="none">
            <path d="M -140 5 L 10 20" />
            <path d="M -140 85 L 0 110" />
            <path d="M -140 165 L 0 140" />
            <path d="M -140 245 L 10 210" />
          </g>
        </g>

        {/* =========================================
            BOTTOM SECTION: PERFORMANCE CARD
            ========================================= */}
        <g transform="translate(50, 420)">
          <rect width="700" height="150" rx="24" fill="white" stroke="#F1F5F9" strokeWidth="1" style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.06))' }} />
          
          <text x="30" y="40" fill="#0F172A" fontSize="16" className="label-text">System Performance</text>
          <text x="670" y="40" textAnchor="end" fill="#64748B" fontSize="10" className="label-text">Distribute your monolith API</text>

          {/* Metric 1: Throughput */}
          <g transform="translate(30, 70)">
            <text x="0" y="0" fill="#64748B" fontSize="10" className="label-text">MAX THROUGHPUT (REQ/SEC)</text>
            <rect x="0" y="10" width="640" height="10" rx="5" fill="#F1F5F9" />
            <rect x="0" y="10" width="100" height="10" rx="5" fill="#3B82F6" className="throughput-bar" />
          </g>

          {/* Metric 2: Infrastructure Cost */}
          <g transform="translate(30, 115)">
            <text x="0" y="0" fill="#64748B" fontSize="10" className="label-text">INFRASTRUCTURE COST ($/MO)</text>
            <rect x="0" y="10" width="640" height="10" rx="5" fill="#F1F5F9" />
            <rect x="0" y="10" width="400" height="10" rx="5" fill="#EF4444" className="cost-bar" />
          </g>
        </g>

        {/* Floating Optimization Status */}
        <g transform="translate(650, 40)">
           <rect width="140" height="30" rx="15" fill="#F0FDF4" stroke="#BBF7D0" />
           <circle cx="15" cy="15" r="3" fill="#10B981" />
           <text x="28" y="19" fill="#166534" fontSize="9" className="label-text">Updating Architecture</text>
        </g>
      </svg>
    </div>
  );
}
