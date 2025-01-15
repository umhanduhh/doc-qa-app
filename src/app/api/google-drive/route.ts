/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');

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

    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
    });

    if (!response.data.files) {
      throw new Error('No files found');
    }

    const documents = await Promise.all(
      response.data.files.map(async (file) => {
        try {
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
          // Handle PDFs
          else if (file.mimeType === 'application/pdf' || 
                   file.mimeType === 'application/vnd.google-apps.pdf') {
            console.log(`Processing PDF: ${file.name}`);
            
            const response = await drive.files.get({
              fileId: file.id,
              alt: 'media',
            }, {
              responseType: 'arraybuffer'
            });

            try {
              // Convert ArrayBuffer to Buffer
              const buffer = Buffer.from(response.data as ArrayBuffer);
              const pdfData = await pdfParse(buffer);
              
              // Clean up the extracted text
              const cleanText = pdfData.text
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .trim();               // Remove leading/trailing whitespace

              console.log(`Successfully extracted ${cleanText.length} characters from PDF`);

              return {
                name: file.name || 'Unnamed PDF',
                content: cleanText || 'No text content found in PDF',
                pageCount: pdfData.numpages,
                mimeType: file.mimeType
              };
            } catch (error: any) {  // Type error as any for error handling
              console.error(`Error parsing PDF ${file.name}:`, error);
              return {
                name: file.name || 'Unnamed PDF',
                content: `Error extracting text from PDF: ${error?.message || 'Unknown PDF parsing error'}`,
                mimeType: file.mimeType
              };
            }
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
        } catch (error: any) {
          console.error(`Error fetching file ${file.name}:`, error);
          return {
            name: file.name || 'Unnamed document',
            content: `Error: Could not read file content. Error details: ${error?.message || 'Unknown error'}`
          };
        }
      })
    );

    console.log('Documents processed:', documents.length);
    console.log('Document types:', response.data.files.map(f => f.mimeType));

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Google Drive API Error:', error);
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch documents',
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}