import { getFieldSchema } from "./src/lib/google-sheets";
import 'dotenv/config'; // Load .env and .env.local manually if needed. Actually it's better to use npx tsx --env-file=.env.local

async function run() {
    const s = await getFieldSchema();
    console.log(JSON.stringify(s, null, 2));
}
run();
