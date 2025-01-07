'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';

export default function Home() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const response = await fetch('/api/google-drive');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to fetch documents');
      
      setDocuments(data.documents || []);
      setError('');
    } catch (error: any) {
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
          history: [],
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to get answer');
      
      setAnswer(data.answer);
      setQuestion('');
    } catch (error: any) {
      setError('Failed to get answer. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold mb-8">Document Q&A</h1>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                
                <div className="mb-8">
                  <h2 className="text-xl mb-4">Available Documents:</h2>
                  {loading && documents.length === 0 ? (
                    <p>Loading documents...</p>
                  ) : (
                    <ul className="list-disc pl-5">
                      {documents.map((doc, index) => (
                        <li key={index} className="mb-2">{doc.name}</li>
                      ))}
                    </ul>
                  )}
                </div>

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

                {answer && (
                  <div className="mt-8">
                    <h2 className="text-xl mb-4">Answer:</h2>
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