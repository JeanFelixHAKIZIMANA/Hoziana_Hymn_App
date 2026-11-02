import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
// Fonts are bundled with the site (latin letters, only the weights the styles use) instead of
// loaded from Google Fonts: no extra connections to other servers before text appears.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
import '@fontsource/source-serif-4/latin-500.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
