/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';

export async function GET() {
  try {
    console.log('Environment check:', {
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length
    });

    // Clean up the private key
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.split('\\n').join('\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    console.log('Auth created');
    
    const drive = google.drive({ 
      version: 'v3', 
      auth,
    });

    console.log('Drive created, attempting to list files');

    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 10
    });

    console.log('Files response received');

    return NextResponse.json({ 
      documents: response.data.files || [] 
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      message: 'Error fetching documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}