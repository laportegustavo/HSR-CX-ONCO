import { NextResponse } from 'next/server';
import { getStaffFromSheet } from '@/lib/google-sheets';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const staff = await getStaffFromSheet();
        
        let rawError = 'none';
        let rawCount = -1;
        try {
            const client_email = process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, '').trim();
            const base64Body = process.env.GOOGLE_PRIVATE_KEY?.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
            const lines = base64Body?.match(/.{1,64}/g)?.join('\n') || '';
            const private_key = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
            const spreadsheetId = process.env.GOOGLE_SHEET_ID?.replace(/^"|"$/g, '').trim();

            const auth = new google.auth.GoogleAuth({
                credentials: { client_email, private_key },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            const sheets = google.sheets({ version: 'v4', auth });
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Equipe!A2:I'
            });
            rawCount = response.data.values?.length || 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            rawError = e.message;
        }

        return NextResponse.json({ 
            success: true,
            total_staff: staff.length, 
            raw_count: rawCount,
            raw_error: rawError,
            staff_is_array: Array.isArray(staff)
        });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
