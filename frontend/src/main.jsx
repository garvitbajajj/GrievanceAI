import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom';
import { GrievanceFlowProvider } from './context/GrievanceFlowContext';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <GrievanceFlowProvider>
        <App />
      </GrievanceFlowProvider>
    </Router>
  </StrictMode>,
)
