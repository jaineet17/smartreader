import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './HistoryPage.css';

const HistoryPage = ({ apiUrl }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSummaries = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/summaries`);
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        const data = await response.json();
        setSummaries(data.summaries || []);
      } catch (err) {
        setError(err.message || 'An error occurred');
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [apiUrl]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const filteredSummaries = summaries.filter(summary => 
    summary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="history-loading">
        <div className="loading-spinner"></div>
        <p>Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/" className="back-link">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Reading History</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="empty-history">
          <p>You haven't summarized any articles yet.</p>
          <Link to="/" className="start-button">Start Summarizing</Link>
        </div>
      ) : (
        <>
          {filteredSummaries.length === 0 ? (
            <div className="no-results">
              <p>No results match your search.</p>
              <button 
                onClick={() => setSearchTerm('')} 
                className="clear-search"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="summaries-list">
              {filteredSummaries.map((summary) => (
                <Link 
                  to={`/summary/${summary.id}`} 
                  key={summary.id} 
                  className="summary-card"
                >
                  <h2 className="summary-title">{truncateText(summary.title, 60)}</h2>
                  <p className="summary-text">{truncateText(summary.summary, 120)}</p>
                  <div className="summary-meta">
                    <span className="summary-date">{formatDate(summary.created_at)}</span>
                    {summary.url && (
                      <span className="summary-source">
                        {new URL(summary.url).hostname}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryPage;