import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';

// Define interfaces for the document structure
interface Document {
  name: string | null;
  id: string | null;
  type: string | null;
  content: string;
}

interface DriveFile {
  id: string | null;
  name: string | null;
  mimeType: string | null;
}

export async function GET() {
  console.log('=== Starting Google Drive API call ===');
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    console.log('Auth created successfully');
    
    const drive = google.drive({ version: 'v3', auth });
    console.log('Drive client created');

    console.log('Attempting to list files with query:', 
      `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`
    );

    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
    });

    console.log('Files response:', response.data);

    if (!response.data.files) {
      throw new Error('No files array in response');
    }

    const documents = await Promise.all(
      response.data.files.map(async (file: DriveFile) => {
        console.log('Processing file:', file.name);
        try {
          if (file.mimeType === 'application/vnd.google-apps.document') {
            // For Google Docs, we need to export as plain text
            const doc = await drive.files.export({
              fileId: file.id!,
              mimeType: 'text/plain',
            });
            
            return {
              name: file.name,
              id: file.id,
              type: file.mimeType,
              content: doc.data as string
            } satisfies Document;
          } else {
            const doc = await drive.files.get({
              fileId: file.id!,
              alt: 'media',
            });
            return {
              name: file.name,
              id: file.id,
              type: file.mimeType,
              content: typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data)
            } satisfies Document;
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            name: file.name,
            id: file.id,
            type: file.mimeType,
            content: `Error: ${errorMessage}`
          } satisfies Document;
        }
      })
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error in Google Drive route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Error fetching documents: ${errorMessage}` },
      { status: 500 }
    );
  }
}