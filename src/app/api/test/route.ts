import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Test route called');
  console.log('Env vars:', {
    folderIdExists: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    clientEmailExists: !!process.env.GOOGLE_CLIENT_EMAIL,
    privateKeyExists: !!process.env.GOOGLE_PRIVATE_KEY
  });
  
  return NextResponse.json({ 
    message: 'Test route', 
    envVarsExist: {
      folderIdExists: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      clientEmailExists: !!process.env.GOOGLE_CLIENT_EMAIL,
      privateKeyExists: !!process.env.GOOGLE_PRIVATE_KEY
    } 
  });
}