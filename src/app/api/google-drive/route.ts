import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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
      response.data.files.map(async (file) => {
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
            };
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
            };
          }
        } catch (error: any) {
          console.error(`Error processing file ${file.name}:`, error);
          return {
            name: file.name,
            id: file.id,
            type: file.mimeType,
            content: `Error: ${error.message}`
          };
        }
      })
    );

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Error in Google Drive route:', error);
    return NextResponse.json(
      { message: `Error fetching documents: ${error.message}` },
      { status: 500 }
    );
  }
}