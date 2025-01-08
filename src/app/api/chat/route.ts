import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('Function started at:', new Date().toISOString());

  try {
    // Log the raw request body for debugging
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);

    let requestBody;
    try {
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON Parsing Error:', parseError);
      return NextResponse.json(
        { message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('Parsed request body:', JSON.stringify(requestBody, null, 2));

    // Destructure with additional safety
    const { 
      question = '', 
      documents = [], 
      history = [] 
    } = requestBody;

    // Detailed input validation
    console.log('Input validation:', {
      questionProvided: !!question,
      documentsCount: documents.length,
      historyCount: history.length
    });

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

    // Prepare context with extensive logging
    const context = documents.map((doc: any, index: number) => {
      console.log(`Document ${index + 1}:`, {
        name: doc?.name,
        contentLength: doc?.content?.length
      });
      return `Document: ${doc?.name || `Document ${index + 1}`}\nContent: ${doc?.content || ''}`;
    }).join('\n\n');

    const conversationHistory = history.map((msg: any, index: number) => {
      console.log(`History item ${index + 1}:`, {
        role: msg?.role,
        contentLength: msg?.content?.length
      });
      return `${msg?.role || 'unknown'}: ${msg?.content || ''}`;
    }).join('\n');

    console.log('Preparing to send message to Anthropic...');
    
    const startTime = Date.now();
    console.log('API call start time:', startTime);

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-latest',
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