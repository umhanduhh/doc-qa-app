/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question, documents, history } = await request.json();
    
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Log what we're sending to Anthropic
    console.log('Sending to Anthropic:', {
      questionLength: question?.length,
      documentsCount: documents?.length,
      historyCount: history?.length
    });

    const context = documents.map((doc: any) => 
      `Document: ${doc.name}\nContent: ${doc.content}`
    ).join('\n\n');

    const conversationHistory = history?.map((msg: any) => 
      `${msg.role}: ${msg.content}`
    ).join('\n') || '';

    const message = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Context: ${context}\n\nConversation History:\n${conversationHistory}\n\nQuestion: ${question}\n\nPlease answer the question based on the provided documents and conversation history.`
      }]
    });

    if (!message.content?.[0]?.text) {
      throw new Error('Invalid response from Claude API');
    }

    return NextResponse.json({ answer: message.content[0].text });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    
    return NextResponse.json(
      { 
        message: 'Error processing request',
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}