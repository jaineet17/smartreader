import React, { useState } from 'react';
import './InputSection.css';

const InputSection = ({ onSubmit, isLoading }) => {
  const [inputType, setInputType] = useState('url'); // 'url' or 'text'
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (inputType === 'url') {
      if (!urlInput.trim()) {
        setError('Please enter a URL');
        return;
      }

      // Simple URL validation
      try {
        new URL(urlInput);
        onSubmit('url', { url: urlInput });
      } catch (err) {
        setError('Please enter a valid URL');
      }
    } else {
      if (!textInput.trim()) {
        setError('Please enter some text');
        return;
      }

      if (textInput.trim().length < 50) {
        setError('Text is too short. Please enter at least 50 characters.');
        return;
      }

      onSubmit('text', { 
        text: textInput,
        title: titleInput || 'Untitled'
      });
    }
  };

  return (
    <div className="input-section">
      <div className="input-tabs">
        <button 
          className={`tab-button ${inputType === 'url' ? 'active' : ''}`}
          onClick={() => setInputType('url')}
          disabled={isLoading}
        >
          URL
        </button>
        <button 
          className={`tab-button ${inputType === 'text' ? 'active' : ''}`}
          onClick={() => setInputType('text')}
          disabled={isLoading}
        >
          Text
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {inputType === 'url' ? (
          <div className="url-input-container">
            <input
              type="text"
              placeholder="Enter article URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isLoading}
              className="url-input"
            />
          </div>
        ) : (
          <div className="text-input-container">
            <input
              type="text"
              placeholder="Title (optional)"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              disabled={isLoading}
              className="title-input"
            />
            <textarea
              placeholder="Paste or type your text here"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isLoading}
              className="text-input"
              rows={8}
            />
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Summarize'}
        </button>
      </form>
    </div>
  );
};

export default InputSection;