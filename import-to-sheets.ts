import { parsePatientsFromCSV } from './src/lib/csv-parser';
import { savePatientsToSheet, saveStaffToSheet, saveConfigToSheet } from './src/lib/google-sheets';
import * as fs from 'fs';
import * as path from 'path';
import { loadEnvConfig } from '@next/env';
import { google } from 'googleapis';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const getAuth = () => {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
};

const getSheets = () => {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
};

async function ensureSheetsExist() {
    const sheets = getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    
    const requiredSheets = ['Pacientes', 'Equipe', 'Configuracoes'];
    const missingSheets = requiredSheets.filter(title => !existingTitles.includes(title));
    
    if (missingSheets.length > 0) {
        console.log(`Creating missing sheets: ${missingSheets.join(', ')}...`);
        const requests = missingSheets.map(title => ({
            addSheet: { properties: { title } }
        }));
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests }
        });
        console.log("Missing sheets created.");
    }
}

async function main() {
    try {
        console.log("Ensuring sheets exist...");
        await ensureSheetsExist();

        console.log("Importing Patients...");
        const patients = await parsePatientsFromCSV();
        if (patients && patients.length > 0) {
            await savePatientsToSheet(patients);
            console.log(`✅ ${patients.length} patients imported to Google Sheets.`);
        } else {
            console.log("⚠️ No patients found or error reading CSV.");
        }

        console.log("Importing Staff...");
        const staffPath = path.join(projectDir, 'src', 'data', 'staff.json');
        if (fs.existsSync(staffPath)) {
            const staffData = JSON.parse(fs.readFileSync(staffPath, 'utf8'));
            if (staffData.staff && Array.isArray(staffData.staff)) {
                await saveStaffToSheet(staffData.staff);
                console.log(`✅ ${staffData.staff.length} staff members imported to Google Sheets.`);
            } else if (Array.isArray(staffData)) {
                await saveStaffToSheet(staffData);
                console.log(`✅ ${staffData.length} staff members imported to Google Sheets.`);
            } else {
                 console.log(`⚠️ Staff data format unknown.`);
            }
        }

        console.log("Importing Config...");
        const configPath = path.join(projectDir, 'src', 'data', 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            await saveConfigToSheet(configData);
            console.log(`✅ Config imported to Google Sheets.`);
        }

        console.log("Import finished successfully!");
    } catch (e) {
        console.error("Error during import:", e);
    }
}

main();
