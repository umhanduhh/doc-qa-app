/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly'
      ],
    });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // Get files from the specified folder
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
    });

    if (!response.data.files) {
      throw new Error('No files found');
    }

    // Get the content of each document
    const documents = await Promise.all(
      response.data.files.map(async (file) => {
        try {
          // Handle different file types
          if (!file.id) {
            throw new Error('File ID is missing');
          }

          // Handle Google Sheets
          if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
            const sheetsResponse = await sheets.spreadsheets.get({
              spreadsheetId: file.id,
              includeGridData: false,
            });

            if (!sheetsResponse.data.sheets) {
              throw new Error('No sheets found in spreadsheet');
            }

            const allSheetData = await Promise.all(
              sheetsResponse.data.sheets.map(async (sheet) => {
                const sheetTitle = sheet.properties?.title;
                if (!sheetTitle) return null;

                try {
                  const dataResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: file.id as string,
                    range: sheetTitle,
                  });

                  return {
                    sheetName: sheetTitle,
                    data: dataResponse.data.values || []
                  };
                } catch (error) {
                  console.error(`Error fetching sheet ${sheetTitle}:`, error);
                  return null;
                }
              })
            );

            const formattedContent = allSheetData
              .filter((sheet): sheet is { sheetName: string; data: any[][] } => sheet !== null)
              .map(sheet => {
                const rows = sheet.data
                  .map(row => row.join('\t'))
                  .join('\n');
                return `Sheet: ${sheet.sheetName}\n${rows}`;
              })
              .join('\n\n');

            return {
              name: file.name || 'Unnamed spreadsheet',
              content: formattedContent || 'Empty spreadsheet'
            };
          }
          // Handle PDFs and other binary files
          else if (file.mimeType === 'application/pdf' || 
                   file.mimeType === 'application/vnd.google-apps.pdf') {
            // Get the PDF content as a base64 string
            const response = await drive.files.get({
              fileId: file.id,
              alt: 'media',
            }, {
              responseType: 'arraybuffer'
            });

            // Convert buffer to string (this will be the raw text content)
            const content = Buffer.from(response.data).toString('base64');

            return {
              name: file.name || 'Unnamed PDF',
              content: `PDF Content (Base64 encoded): ${content}`,
              mimeType: file.mimeType
            };
          }
          // Handle Google Docs
          else if (file.mimeType === 'application/vnd.google-apps.document') {
            const doc = await drive.files.export({
              fileId: file.id,
              mimeType: 'text/plain',
            });

            return {
              name: file.name || 'Unnamed document',
              content: typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data)
            };
          }
          // Handle regular text files and other documents
          else {
            const doc = await drive.files.get({
              fileId: file.id,
              alt: 'media',
            });
            
            return {
              name: file.name || 'Unnamed document',
              content: typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data)
            };
          }
        } catch (error) {
          console.error(`Error fetching file ${file.name}:`, error);
          return {
            name: file.name || 'Unnamed document',
            content: `Error: Could not read file content. Error details: ${error.message}`
          };
        }
      })
    );

    // Log the number of documents and their types for debugging
    console.log('Documents processed:', documents.length);
    console.log('Document types:', response.data.files.map(f => f.mimeType));

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Google Drive API Error:', error);
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch documents',
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}