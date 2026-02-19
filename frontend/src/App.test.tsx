import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// React Flow uses ResizeObserver which isn't available in JSDOM; provide a basic shim
class ResizeObserver {
  cb: Function;
  constructor(cb: Function) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore
window.ResizeObserver = ResizeObserver;


test('renders sidebar with provider tabs and service items', () => {
  render(<App />);
  // sidebar header
  expect(screen.getByText(/CloudMon/i)).toBeInTheDocument();
  expect(screen.getByText(/Drag services onto the canvas/i)).toBeInTheDocument();
  // provider tabs
  expect(screen.getByText('AWS')).toBeInTheDocument();
  expect(screen.getByText('GCP')).toBeInTheDocument();
  expect(screen.getByText('Azure')).toBeInTheDocument();
  // default AWS tab shows EC2
  expect(screen.getByText('EC2')).toBeInTheDocument();
  expect(screen.getByText('S3')).toBeInTheDocument();
});

test('switches provider tab and shows correct services', () => {
  render(<App />);
  // click GCP tab
  fireEvent.click(screen.getByText('GCP'));
  expect(screen.getByText('Compute Engine')).toBeInTheDocument();
  expect(screen.getByText('Cloud SQL')).toBeInTheDocument();

  // click Azure tab
  fireEvent.click(screen.getByText('Azure'));
  expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
  expect(screen.getByText('Cosmos DB')).toBeInTheDocument();
});

test('toolbar shows analyze button and node/edge counts', () => {
  render(<App />);
  expect(screen.getByText(/Analyze/i)).toBeInTheDocument();
  expect(screen.getByText(/Layout/i)).toBeInTheDocument();
  expect(screen.getByText(/Clear/i)).toBeInTheDocument();
});

test('search filters services', () => {
  render(<App />);
  const search = screen.getByPlaceholderText(/Search services/i);
  fireEvent.change(search, { target: { value: 'lambda' } });
  expect(screen.getByText('Lambda')).toBeInTheDocument();
  // EC2 should be filtered out
  expect(screen.queryByText('EC2')).not.toBeInTheDocument();
});

test('connection type picker is present', () => {
  render(<App />);
  expect(screen.getByText(/Connection Type/i)).toBeInTheDocument();
  expect(screen.getByText(/📊 Data/)).toBeInTheDocument();
  expect(screen.getByText(/🌐 Network/)).toBeInTheDocument();
});

