import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>SmartReader</h3>
            <p>Transform lengthy articles into concise, informative summaries</p>
          </div>
          
          <div className="footer-section">
            <h3>Links</h3>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/history">History</a></li>
              <li><a href="https://github.com/yourusername/smartreader" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>About</h3>
            <p>SmartReader is a student project created using React and Flask with AI-powered summarization.</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} SmartReader. All rights reserved.</p>
          <p className="credits">Created by Your Name</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;