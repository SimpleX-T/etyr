import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SidePanelApp from './SidePanelApp';
import '../popup/styles/popup.css';
import './styles/sidepanel.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <SidePanelApp />
    </StrictMode>,
  );
}