import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import { getBodyStyles } from '../../utils/browser';

// Apply browser-specific body styles
const bodyStyles = getBodyStyles();
Object.assign(document.body.style, bodyStyles);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
