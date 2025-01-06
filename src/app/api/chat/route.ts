import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

// Define interfaces for your data structures
interface Document {
  name: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';  // adjust roles based on your actual needs
  content: string;
}

interface RequestBody {
  question: string;
  documents: Document[];
  history: ChatMessage[];
}

export async function POST(request: Request) {
  try {
    const { question, documents, history } = await request.json() as RequestBody;
    console.log('Received in API:', { question, documents }); 
    
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });

    const context = documents.map((doc: Document) => 
      `Document: ${doc.name}\nContent: ${doc.content}`
    ).join('\n\n');

    const conversationHistory = history.map((msg: ChatMessage) => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    const message = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Context: ${context}\n\nConversation History:\n${conversationHistory}\n\nQuestion: ${question}\n\nPlease answer the question based on the provided documents and conversation history.`
      }]
    });

    if (!message.content || !message.content[0] || !message.content[0].text) {
      throw new Error('Invalid response from Claude');
    }

    return NextResponse.json({ 
      answer: message.content[0].text 
    });

  } catch (error) {
    console.error('Error:', error);
    // Use a more specific type for the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { message: 'Error processing your request', error: errorMessage },
      { status: 500 }
    );
  }
}