/* eslint-disable @typescript-eslint/no-explicit-any */

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';
import { drive_v3 } from 'googleapis';

type Schema$File = drive_v3.Schema$File;

export async function GET() {
  try {
    // Log environment variables (securely)
    console.log('Environment check:', {
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length
    });

    // Create auth object with error handling
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY,
          type: 'service_account'
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      console.log('Auth object created successfully');
    } catch (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json({ 
        message: 'Authentication setup failed',
        error: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 500 });
    }

    // Create drive object with error handling
    let drive;
    try {
      drive = google.drive({ version: 'v3', auth });
      console.log('Drive object created successfully');
    } catch (driveError) {
      console.error('Drive creation error:', driveError);
      return NextResponse.json({ 
        message: 'Drive setup failed',
        error: driveError instanceof Error ? driveError.message : 'Unknown drive error'
      }, { status: 500 });
    }

    // List files with error handling
    try {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
      });
      console.log('Files listed successfully:', response.data.files?.length || 0, 'files found');

      return NextResponse.json({ documents: response.data.files || [] });
    } catch (listError) {
      console.error('File listing error:', listError);
      return NextResponse.json({ 
        message: 'Failed to list files',
        error: listError instanceof Error ? listError.message : 'Unknown list error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Top level error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}