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
          // Handle Google Sheets
          if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
            const sheetsResponse = await sheets.spreadsheets.get({
              spreadsheetId: file.id!,
              includeGridData: true,
            });

            // Get all sheets in the spreadsheet
            const allSheetData = await Promise.all(
              sheetsResponse.data.sheets!.map(async (sheet) => {
                const sheetTitle = sheet.properties?.title;
                const range = sheetTitle; // This will get all data in the sheet

                const dataResponse = await sheets.spreadsheets.values.get({
                  spreadsheetId: file.id!,
                  range: range,
                });

                return {
                  sheetName: sheetTitle,
                  data: dataResponse.data.values || []
                };
              })
            );

            // Convert sheet data to readable format
            const formattedContent = allSheetData
              .map(sheet => {
                const rows = sheet.data
                  .map(row => row.join('\t'))
                  .join('\n');
                return `Sheet: ${sheet.sheetName}\n${rows}`;
              })
              .join('\n\n');

            return {
              name: file.name || 'Unnamed spreadsheet',
              content: formattedContent
            };
          } 
          // Handle regular documents
          else {
            const doc = await drive.files.get({
              fileId: file.id!,
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
            content: 'Error: Could not read file content'
          };
        }
      })
    );

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