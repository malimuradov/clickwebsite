import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { SocketProvider } from './contexts/SocketContext';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    
    <SocketProvider>
      <App />
      <footer>
      <h3><a href="https://www.flaticon.com/free-icons/mouse-clicker" title="mouse clicker icons">Mouse clicker icons created by Andrean Prabowo - Flaticon</a></h3>
      </footer>
    </SocketProvider>
  </React.StrictMode>
  
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
