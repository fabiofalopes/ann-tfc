import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

try {
  root.render(
    <React.StrictMode>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering the app:', error);
  document.body.innerHTML = '<h1>An error occurred while loading the application. Please check the console for more details.</h1>';
}

// If you want to start measuring performance in your app, pass a function
// ... existing code ...