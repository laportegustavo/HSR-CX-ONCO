import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Use dynamic rendering since it reads env variables that could change
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client_email = process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, '').trim();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID?.replace(/^"|"$/g, '').trim();

        // Bulletproof parsing
        const base64Body = process.env.GOOGLE_PRIVATE_KEY?.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
        const lines = base64Body?.match(/.{1,64}/g)?.join('\n') || '';
        const private_key = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
