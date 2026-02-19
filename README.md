# CloudMon

This repository will host a cloud infrastructure monitoring and analysis application. The first phase focuses on a **frontend** application that allows users to visually design clusters of cloud infrastructure across AWS, GCP, and Azure. Users can drag and drop providers and services to assemble a plan, then run analysis for load, throughput, and bottlenecks.

## Frontend (React)

The frontend is located in `../frontend` (sibling folder) and is built with React and TypeScript. It uses `react-flow-renderer` to power a drag-and-drop diagram editor.

### Getting Started

```bash
# from workspace root
cd frontend
npm install
npm start
```

A basic canvas is already implemented. Future work will add:

* Palette/sidebar with AWS, GCP, Azure service nodes (implemented)
* Custom node types (compute, network, storage, etc.) with color‑coding (implemented)
* Logic to calculate capacity, load and highlight bottlenecks
* Integration with backend APIs for real-time analysis

## Next Steps

1. Enhance the drag-and-drop editor with provider-specific components.
2. Build a backend service that performs capacity/throughput analysis.
   * a simple Node/Express app now lives in `backend/` with a `/analyze` endpoint returning dummy metrics.
   * start it with `npm install && npm run dev` from that directory.
3. Connect frontend and backend; visualize analysis results.
