import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputSection from '../components/InputSection';
import { toast } from 'react-toastify';
import './Home.css';

const Home = ({ apiUrl }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleProcessContent = async (type, content) => {
    setIsLoading(true);
    
    try {
      let url = `${apiUrl}/summarize`;
      let requestBody = {};
      
      if (type === 'text') {
        requestBody = { 
          text: content.text,
          title: content.title || 'Untitled Text'
        };
      } else if (type === 'url') {
        requestBody = { url: content.url };
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process content');
      }
      
      // Navigate to summary page
      navigate(`/summary/${data.id}`);
      
    } catch (error) {
      console.error('Error processing content:', error);
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to SmartReader</h1>
        <p className="tagline">Transform lengthy articles into concise, informative summaries</p>
      </div>
      
      <div className="input-container">
        <InputSection onSubmit={handleProcessContent} isLoading={isLoading} />
      </div>
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing your content...</p>
        </div>
      )}
      
      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Smart Summarization</h3>
            <p>Condense long articles into concise summaries that retain the key information</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">❓</div>
            <h3>Ask Questions</h3>
            <p>Ask specific questions about the content for deeper understanding</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>URL Analysis</h3>
            <p>Simply paste a URL and we'll extract and process the content automatically</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Reading History</h3>
            <p>Access your previously summarized articles anytime</p>
          </div>
        </div>
      </div>
      
      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <p>Paste an article URL or text</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <p>Our AI processes the content</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <p>Get your summary and start asking questions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;