import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Debugging: Log execution start
console.log("Main.jsx is executing...");

// Debugging: Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
  console.error("GLOBAL ERROR DETECTED:", message, "\nSource:", source, "\nLine:", lineno, "\nError object:", error);
};

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
