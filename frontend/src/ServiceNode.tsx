/* ──────────────────────────────────────────────────────────────
   ServiceNode.tsx
   Service node data types for Cytoscape canvas.
   ────────────────────────────────────────────────────────────── */
import {
  CloudProvider,
  ServiceCategory,
} from './serviceCatalog';

export interface ServiceNodeData {
  serviceId: string;
  label: string;
  icon: string;
  provider: CloudProvider;
  category: ServiceCategory;
  throughput: number;
  latency: number;
  instanceTypeId?: string;
  instanceLabel?: string;
  vcpus?: number;
  memoryGb?: number;
  replicas?: number;
}
