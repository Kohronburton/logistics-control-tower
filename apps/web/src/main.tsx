import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WowHero from './WowHero';
import './styles.css';
import './wow.css';
import './decision.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WowHero />
    <div id="control-tower-deep-dive">
      <App />
    </div>
  </React.StrictMode>
);
