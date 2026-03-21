import { getStaffFromSheet } from './src/lib/google-sheets';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
    try {
        const staff = await getStaffFromSheet();
        console.log("Staff fetched:", staff);
    } catch (e) {
        console.error("Error fetching staff:", e);
    }
}
main();
