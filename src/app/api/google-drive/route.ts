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
    
    const drive = google.drive({ version: 'v3', auth });
    console.log('Drive created, attempting to list files');

    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size)',
      pageSize: 10
    });

    console.log('Files found:', {
      totalFiles: response.data.files?.length || 0,
      fileNames: response.data.files?.map(f => f.name) || [],
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
    });

    const documents = await Promise.all(
      (response.data.files || []).map(async (file) => {
        try {
          const doc = await drive.files.get({
            fileId: file.id!,
            alt: 'media'
          });

          return {
            name: file.name || 'Unnamed file',
            id: file.id!,
            type: file.mimeType || 'unknown',
            content: typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data)
          };
        } catch (error) {
          console.error(`Error getting file ${file.name}:`, error);
          return {
            name: file.name || 'Unnamed file',
            id: file.id!,
            type: file.mimeType || 'unknown',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
    );

    console.log('Documents processed:', {
      count: documents.length,
      names: documents.map(d => d.name)
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error in Google Drive route:', error);
    return NextResponse.json(
      { 
        message: 'Error fetching documents',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}