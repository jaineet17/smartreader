import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './SummaryPage.css';

const SummaryPage = ({ apiUrl }) => {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Fetch summary when component mounts
  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/summaries/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch summary');
        }
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(err.message || 'An error occurred');
        toast.error('Failed to load summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [apiUrl, id]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: summary.title,
        text: summary.summary,
        url: window.location.href,
      }).catch(err => {
        console.error('Share failed:', err);
      });
    } else {
      // Fallback for browsers that don't support share API
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.warning('Please enter a question');
      return;
    }
    
    setAskingQuestion(true);
    
    try {
      const response = await fetch(`${apiUrl}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          summary_id: id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      const data = await response.json();
      
      // Update the summary with the new question/answer
      setSummary(prev => ({
        ...prev,
        questions: [data, ...(prev.questions || [])]
      }));
      
      // Clear the question input
      setQuestion('');
      
    } catch (err) {
      toast.error(err.message || 'Failed to process question');
    } finally {
      setAskingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="summary-loading">
        <div className="loading-spinner"></div>
        <p>Loading summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="summary-error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/" className="back-link">Back to Home</Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="summary-error">
        <h2>Summary Not Found</h2>
        <p>The requested summary could not be found.</p>
        <Link to="/" className="back-link">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="summary-page">
      <div className="summary-header">
        <h1>{summary.title}</h1>
        {summary.url && (
          <a href={summary.url} target="_blank" rel="noopener noreferrer" className="source-link">
            View Original Source
          </a>
        )}
      </div>

      <div className="summary-card">
        <h2>Summary</h2>
        <p>{summary.summary}</p>
        <div className="actions">
          <button onClick={() => handleCopy(summary.summary)} className="action-button">
            Copy
          </button>
          <button onClick={handleShare} className="action-button">
            Share
          </button>
        </div>
      </div>

      <div className="ask-section">
        <h2>Ask a Question</h2>
        <form onSubmit={handleAskQuestion} className="question-form">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something about the content..."
            disabled={askingQuestion}
            className="question-input"
          />
          <button 
            type="submit" 
            disabled={askingQuestion} 
            className="ask-button"
          >
            {askingQuestion ? 'Processing...' : 'Ask'}
          </button>
        </form>
      </div>

      {summary.questions && summary.questions.length > 0 && (
        <div className="questions-section">
          <h2>Questions & Answers</h2>
          <div className="questions-list">
            {summary.questions.map((qa) => (
              <div key={qa.id} className="qa-item">
                <div className="question">
                  <strong>Q:</strong> {qa.question}
                </div>
                <div className="answer">
                  <strong>A:</strong> {qa.answer}
                </div>
                <button 
                  onClick={() => handleCopy(qa.answer)} 
                  className="copy-button"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryPage;