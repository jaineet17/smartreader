import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import SummaryPage from './pages/SummaryPage';
import HistoryPage from './pages/HistoryPage';
import Footer from './components/Footer';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// API URL - change when deploying
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function App() {
  const [isServerReady, setIsServerReady] = useState(null);
  
  // Check server status on load
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        if (data.status === 'initializing') {
          setIsServerReady(false);
          // Check again in 10 seconds
          setTimeout(checkServerStatus, 10000);
        } else {
          setIsServerReady(true);
        }
      } catch (error) {
        console.error('Server check failed:', error);
        setIsServerReady(false);
        toast.error('Cannot connect to server. Please try again later.');
        // Try again in 30 seconds
        setTimeout(checkServerStatus, 30000);
      }
    };
    
    checkServerStatus();
  }, []);
  
  return (
    <Router>
      <div className="app">
        <NavBar />
        
        <main className="content">
          {isServerReady === false && (
            <div className="server-loading">
              <div className="loading-spinner"></div>
              <p>Server is initializing. This may take a minute...</p>
            </div>
          )}
          
          <Routes>
            <Route path="/" element={<Home apiUrl={API_URL} />} />
            <Route path="/summary/:id" element={<SummaryPage apiUrl={API_URL} />} />
            <Route path="/history" element={<HistoryPage apiUrl={API_URL} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <Footer />
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

export default App;