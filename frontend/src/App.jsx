import React, { useState, useEffect } from 'react';

function AccordionItem({ id, title, content, callSid, query, onEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = async () => {
    try {
      const result = await fetch('http://localhost:3000/api/save-edited-response', {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid, editedResponse: editedContent, query })
      });
      const data = await result.json();
      if (data.status === 'success') {
        onEdit(id, editedContent);
        setIsEditing(false);
      } else {
        alert('Failed to save edited response');
      }
    } catch (err) {
      console.error('Error saving edited response:', err);
      alert('Error saving edited response');
    }
  };

  return (
    <div className="accordion-item">
      <button
        className="accordion-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="accordion-title">{title}</span>
        <span>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="accordion-content">
          {isEditing ? (
            <div>
              <textarea
                className="edit-textarea"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
              />
              <div>
                <button
                  className="save-button"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="content-wrapper">
              <p>{content}</p>
              <button
                className="edit-button"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [callSid, setCallSid] = useState('test-call-sid-123');
  const [from, setFrom] = useState('+1234567890');
  const [to, setTo] = useState('+0987654321');
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [editedResponse, setEditedResponse] = useState('');
  const [fallbackQuery, setFallbackQuery] = useState(null);
  const [pineconeFallbacks, setPineconeFallbacks] = useState([]);
  const [pineconeError, setPineconeError] = useState(null);
  const [fromPinecone, setFromPinecone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFallbacks = async () => {
      setLoading(true);
      try {
        console.log('Fetching Pinecone fallbacks from /api/pinecone-fallbacks...');
        const result = await fetch(`http://localhost:3000/api/pinecone-fallbacks`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('Fetch response status:', result.status);
        if (!result.ok) {
          throw new Error(`Failed to fetch Pinecone fallbacks: ${result.statusText}`);
        }
        const data = await result.json();
        console.log('Fetched Pinecone fallbacks:', data);
        setPineconeFallbacks(data);
      } catch (err) {
        console.error('Error fetching Pinecone fallbacks:', err);
        setPineconeError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFallbacks();
  }, []);

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    setResponse('');
    setFromPinecone(false);
    const conversationHistory = [];
    console.log('Submitting query:', query);
    const result = await fetch('http://localhost:3000/api/query', {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, callSid, from, to, conversationHistory })
    });
    const data = await result.json();
    console.log('Query response:', data);
    if (data.status === 'fallback') {
      setIsEditingResponse(true);
      setFallbackQuery(data.query);
      setEditedResponse('');
      setQuery(data.query);
      setCallSid(data.callSid);
      setFrom(data.from || from);
      setTo(data.to || to);
      // Refresh fallbacks after a new fallback is added
      try {
        console.log('Fetching updated Pinecone fallbacks after query...');
        const fallbacksResult = await fetch('http://localhost:3000/api/pinecone-fallbacks', {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('Updated fetch response status:', fallbacksResult.status);
        if (!fallbacksResult.ok) {
          throw new Error('Failed to fetch Pinecone fallbacks after query');
        }
        const fallbacksData = await fallbacksResult.json();
        console.log('Updated Pinecone fallbacks:', fallbacksData);
        setPineconeFallbacks(fallbacksData);
      } catch (err) {
        console.error('Error fetching Pinecone fallbacks after query:', err);
        setPineconeError(err.message);
      }
    } else {
      setResponse(data.response);
      setCallSid(data.callSid);
      setFromPinecone(data.fromPinecone);
      if (data.fromPinecone) {
        alert(`Response retrieved from Pinecone: ${data.response}`);
      }
    }
  };

  const handleSaveEditedResponse = async () => {
    if (!editedResponse) {
      alert('Please enter a response.');
      return;
    }
    console.log('Saving edited response for query:', fallbackQuery);
    const result = await fetch('http://localhost:3000/api/save-edited-response', {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid, editedResponse, query: fallbackQuery })
    });
    const data = await result.json();
    console.log('Save edited response result:', data);
    setResponse(data.response);
    setFromPinecone(true);
    setIsEditingResponse(false);
    setFallbackQuery(null);

    // Refresh fallbacks after saving
    try {
      console.log('Fetching updated Pinecone fallbacks after saving...');
      const fallbacksResult = await fetch('http://localhost:3000/api/pinecone-fallbacks', {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Updated fetch response status after saving:', fallbacksResult.status);
      if (!fallbacksResult.ok) {
        throw new Error('Failed to fetch Pinecone fallbacks after saving');
      }
      const fallbacksData = await fallbacksResult.json();
      console.log('Updated Pinecone fallbacks after saving:', fallbacksData);
      setPineconeFallbacks(fallbacksData);
    } catch (err) {
      console.error('Error fetching Pinecone fallbacks after saving:', err);
      setPineconeError(err.message);
    }
  };

  const handleEditFallback = (id, newContent) => {
    setPineconeFallbacks(pineconeFallbacks.map((item, index) =>
      index + 1 === id ? { ...item, response: newContent } : item
    ));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Submit Query</h2>
      <form onSubmit={handleSubmitQuery}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>Submit</button>
      </form>
      {isEditingResponse && (
        <div style={{ marginTop: '20px' }}>
          <p>Query: {fallbackQuery} (Gemini could not respond)</p>
          <textarea
            value={editedResponse}
            onChange={(e) => setEditedResponse(e.target.value)}
            placeholder="Edit the response"
            style={{ width: '100%', height: '100px', marginBottom: '10px' }}
          />
          <button onClick={handleSaveEditedResponse} style={{ padding: '8px 16px' }}>Save</button>
        </div>
      )}
      {response && !isEditingResponse && (
        <div style={{ marginTop: '20px' }}>
          <p><strong>Response:</strong> {response}</p>
          {fromPinecone && <p style={{ color: 'green' }}>(Fetched from Pinecone)</p>}
        </div>
      )}
      <h2 style={{ marginTop: '40px' }}>Previous Response Question</h2>
      {loading ? (
        <p>Loading Pinecone data...</p>
      ) : pineconeError ? (
        <p style={{ color: 'red' }}>Error: {pineconeError}</p>
      ) : pineconeFallbacks.length > 0 ? (
        <div className="accordion-container">
          <style>{`
            .accordion-container {
              max-width: 600px;
              margin: 32px auto;
            }
            .accordion-item {
              border-bottom: 1px solid #e5e5e5;
            }
            .accordion-button {
              display: flex;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              padding: 16px;
              background-color: #f9fafb;
              text-align: left;
              cursor: pointer;
              border: none;
              font-size: 16px;
            }
            .accordion-button:hover {
              background-color: #f3f4f6;
            }
            .accordion-title {
              font-weight: 500;
            }
            .accordion-content {
              padding: 16px;
            }
            .content-wrapper {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .edit-textarea {
              width: 100%;
              padding: 8px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .edit-button,
            .save-button,
            .cancel-button {
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            .edit-button {
              background-color: #10b981;
              color: white;
              margin-left: 16px;
            }
            .edit-button:hover {
              background-color: #059669;
            }
            .save-button {
              background-color: #3b82f6;
              color: white;
              margin-right: 8px;
            }
            .save-button:hover {
              background-color: #2563eb;
            }
            .cancel-button {
              background-color: #d1d5db;
            }
            .cancel-button:hover {
              background-color: #9ca3af;
            }
          `}</style>
          {pineconeFallbacks.map((item, index) => (
            <AccordionItem
              key={index}
              id={index + 1}
              title={item.query}
              content={item.response}
              callSid={item.id}
              query={item.query}
              onEdit={handleEditFallback}
            />
          ))}
        </div>
      ) : (
        <p>No queries found in Pinecone. If you recently added a query, try refreshing the page.</p>
      )}
    </div>
  );
}

export default App;