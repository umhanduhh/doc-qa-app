import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('Function started at:', new Date().toISOString());

  try {
    // Log the entire request body for debugging
    const requestBody = await request.json();
    console.log('Full request body:', JSON.stringify({
      questionLength: requestBody.question?.length,
      documentsCount: requestBody.documents?.length,
      historyCount: requestBody.history?.length
    }, null, 2));

    const { question, documents, history } = requestBody;

    // Early validation with more detailed logging
    if (!question) {
      console.error('Validation Error: No question provided');
      return NextResponse.json(
        { message: 'Question is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Configuration Error: ANTHROPIC_API_KEY is missing');
      return NextResponse.json(
        { message: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('Initializing Anthropic client...');
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Prepare context and history with additional safety checks
    const context = (documents || [])
      .map((doc: any) => {
        console.log(`Processing document: ${doc?.name || 'Unnamed'}`);
        return `Document: ${doc?.name || 'Unnamed'}\nContent: ${doc?.content || ''}`;
      })
      .join('\n\n');

    const conversationHistory = (history || [])
      .map((msg: any) => `${msg?.role || 'unknown'}: ${msg?.content || ''}`)
      .join('\n');

    console.log('Preparing to send message to Anthropic...');
    
    // Set a longer timeout and add more detailed logging
    const startTime = Date.now();
    console.log('API call start time:', startTime);

    const message = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Context: ${context}\n\nConversation History:\n${conversationHistory}\n\nQuestion: ${question}\n\nPlease answer the question based on the provided documents and conversation history.`
      }]
    });

    const endTime = Date.now();
    console.log('API call duration:', endTime - startTime, 'ms');

    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent) {
      console.error('Error: No text content in Anthropic response');
      throw new Error('No text content in response');
    }

    console.log('Successfully processed response');
    return NextResponse.json({ answer: textContent.text });

  } catch (error: any) {
    // Comprehensive error logging
    console.error('Detailed Error Breakdown:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Check for specific Anthropic SDK or network errors
    if (error.name === 'APIConnectionError') {
      console.error('Network or API connection issue:', error.message);
    }

    return NextResponse.json(
      {
        message: 'Error processing request',
        error: error.message || 'Unknown error',
        errorType: error.name
      },
      { status: 500 }
    );
  } finally {
    console.log('Function execution completed at:', new Date().toISOString());
  }
}