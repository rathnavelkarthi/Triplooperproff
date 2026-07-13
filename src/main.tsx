import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-05-30',
});

window.addEventListener("error", (e) => {
  document.body.innerHTML += `<div style="color:red;z-index:9999;position:fixed;top:0;left:0;background:black">${e.message}<br>${e.error?.stack}</div>`;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
