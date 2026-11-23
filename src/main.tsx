import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { readTodayFromUrl } from './lib/url';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const today = readTodayFromUrl(window.location.search);

createRoot(root).render(
  <StrictMode>
    <App {...(today ? { initialToday: today } : {})} />
  </StrictMode>,
);
