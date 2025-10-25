import React from 'react';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/components.css';

export const SummarizeButton = ({ postBody }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper for exponential backoff retry
  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response.json();
        }
        // Don't retry on client errors, only server/rate limit errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client Error: ${response.status} ${response.statusText}`);
        }
        // Retry on 5xx or 429
        if (response.status === 429 || response.status >= 500) {
           console.warn(`Retrying... Attempt ${i + 1}/${retries}`);
           await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
           continue;
        }
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
    throw new Error('API request failed after all retries.');
  };

  const handleSummarize = async () => {
    setIsModalOpen(true);
    setIsLoading(true);
    setError('');
    setSummary('');

    // --- Gemini API Call ---
    const apiKey = ""; // API key is injected by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const systemPrompt = "You are a helpful summarization assistant. Summarize the following post content into two or three concise bullet points. Be neutral and clear.";
    const userQuery = postBody;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
    };

    try {
      const result = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setSummary(text);
      } else {
        throw new Error('Invalid response structure from API.');
      }
    } catch (err) {
      console.error("AI summarization failed:", err);
      setError('Failed to generate summary. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleSummarize} className="summarize-btn">
        <Sparkles className="summarize-btn__icon" />
        Summarize
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="summarize-modal__title">Post Summary</h2>
        {isLoading && <LoadingSpinner />}
        {error && <p className="summarize-modal__error">{error}</p>}
        {summary && (
          <div className="summary-content" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} />
        )}
        <div className="summarize-modal__actions">
          <Button onClick={() => setIsModalOpen(false)} variant="primary">Close</Button>
        </div>
      </Modal>
    </>
  );
};