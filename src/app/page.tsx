'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const response = await fetch('/api/google-drive');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to fetch documents');
      
      setDocuments(data.documents);
      setError('');
    } catch (error) {
      setError('Failed to load documents. Please check your Google Drive settings.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          documents,
          history,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to get answer');

      // Update conversation history
      const newHistory = [
        ...history,
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer }
      ];
      setHistory(newHistory);
      setAnswer(data.answer);
      setQuestion('');
    } catch (error) {
      setError('Failed to get answer. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-4xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-3xl mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold mb-8">Document Q&A</h1>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                
                {/* Document List */}
                <div className="mb-8">
                  <h2 className="text-xl mb-4">Available Documents:</h2>
                  {loading && documents.length === 0 ? (
                    <p>Loading documents...</p>
                  ) : (
                    <ul className="list-disc pl-5">
                      {documents.map((doc: any, index: number) => (
                        <li key={index} className="mb-2">{doc.name}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Conversation History */}
                {history.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl mb-4">Conversation History:</h2>
                    <div className="space-y-4">
                      {history.map((msg: any, index: number) => (
                        <div
                          key={index}
                          className={`p-4 rounded ${
                            msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                          }`}
                        >
                          <div className="font-bold mb-1">
                            {msg.role === 'user' ? 'You:' : 'Assistant:'}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Ask a question:
                    </label>
                    <textarea
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={4}
                      placeholder="Enter your question about the documents..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || documents.length === 0}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
                  >
                    {loading ? 'Loading...' : 'Ask Question'}
                  </button>
                </form>

                {/* Current Answer */}
                {answer && (
                  <div className="mt-8">
                    <h2 className="text-xl mb-4">Latest Answer:</h2>
                    <div className="bg-gray-100 p-4 rounded">
                      {answer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}