/* eslint-disable @typescript-eslint/no-explicit-any */

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question, documents, history } = await request.json();
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });

    const context = documents.map((doc: any) => 
      `Document: ${doc.name}\nContent: ${doc.content}`
    ).join('\n\n');

    const conversationHistory = history.map((msg: any) => 
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

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: 'Error processing your request', error: error.message },
      { status: 500 }
    );
  }
}