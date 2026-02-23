import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// CONSTITUTION ENFORCEMENT: Validate engine on startup
import { validateConstitution } from './constitution/constitutionValidator';

try {
    validateConstitution();
} catch (error) {
    console.error('🚨 [FATAL] Constitution validation failed. App will not start.');
    console.error(error);
}

import { HashRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>
);
