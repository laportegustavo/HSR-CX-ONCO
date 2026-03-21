import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Use dynamic rendering since it reads env variables that could change
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client_email = process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, '').trim();
        let private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID?.replace(/^"|"$/g, '').trim();

        if (private_key && !private_key.includes('BEGIN PRIVATE KEY')) {
            private_key = `-----BEGIN PRIVATE KEY-----\n${private_key}\n-----END PRIVATE KEY-----\n`;
        }

        if (!client_email || !private_key || !spreadsheetId) {
            throw new Error(`Valores faltantes: Email: ${!!client_email}, Key: ${!!private_key}, ID: ${!!spreadsheetId}`);
        }

        const credentials = { client_email, private_key };
        
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Equipe',
        });
        
        return NextResponse.json({ 
            status: "SUCCESS", 
            usersFound: response.data.values?.length,
            message: "Conexão com Sheets bem sucedida na Vercel"
        });
    } catch (e: any) {
        return NextResponse.json({ 
            status: "ERROR", 
            error_message: e.message, 
            diagnostics: {
                hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
                emailVal: process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
                hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
                keyStartsWith: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 30),
                hasId: !!process.env.GOOGLE_SHEET_ID,
                idVal: process.env.GOOGLE_SHEET_ID?.replace(/^"|"$/g, '')
            }
        });
    }
}
