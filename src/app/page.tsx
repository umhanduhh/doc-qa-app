'use client';

import { useState, useEffect } from 'react';

// Define interfaces for your data structures
interface Document {
  name: string;
  id: string;
  type: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
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
      ] as ChatMessage[];
      
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
                      {documents.map((doc: Document, index: number) => (
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
                      {history.map((msg: ChatMessage, index: number) => (
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

                {/* Rest of your JSX remains the same */}
                {/* ... */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}