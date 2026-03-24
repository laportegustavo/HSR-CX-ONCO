require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const getAuth = () => {
    const client_email = process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, '').trim();
    const base64Body = process.env.GOOGLE_PRIVATE_KEY?.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
    const lines = base64Body?.match(/.{1,64}/g)?.join('\n') || '';
    const private_key = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
    const credentials = { client_email, private_key };
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
};

async function main() {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID?.replace(/^"|"$/g, '');
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'ConfigCampos!A2:J' });
        console.log("SCHEMA FROM SHEET:");
        response.data.values.forEach(row => {
            if (row[0] === 'waitTime' || row[0] === 'teamPosition' || parseInt(row[4]) >= 28) {
                console.log(`ID: ${row[0]}, LABEL: ${row[1]}, COL: ${row[4]}`);
            }
        });
    } catch(e) { console.error(e); }
}
main();
