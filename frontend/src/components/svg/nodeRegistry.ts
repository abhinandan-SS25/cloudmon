/* ═══════════════════════════════════════════════════════════════
   nodeRegistry.ts
   Maps catalog type strings → custom canvas SVG components.

   HOW TO ADD A NEW CUSTOM CARD:
     1. Create a file in src/components/svg/ that exports a
        component with the signature:
            ({ node }: { node: CyNode }) => JSX.Element | null
        Draw inside [0,0] → [node.width, node.height]. No outer rect.
     2. Import it here and add an entry below.

   Types NOT listed here fall back to the generic CanvasNodeSVG card.
   ═══════════════════════════════════════════════════════════════ */
import type { CyNode } from '../../types';
import { CanvasServerCard } from './ServerCard';

export type NodeRenderer = React.FC<{ node: CyNode }>;

/* ── Registry ────────────────────────────────────────────────── */
const NODE_REGISTRY: Record<string, NodeRenderer> = {
  /* Compute – server rack illustration */
  web_server:      CanvasServerCard,
  app_server:      CanvasServerCard,
  monolithic_api:  CanvasServerCard,
  microservice:    CanvasServerCard,
  serverless:      CanvasServerCard,
  container:       CanvasServerCard,
  kubernetes:      CanvasServerCard,
  graphql:         CanvasServerCard,

  /* Add more entries here as you create custom SVG files, e.g.:
     redis:        CanvasRedisCard,
     kafka:        CanvasKafkaCard,
  */
};

export default NODE_REGISTRY;
