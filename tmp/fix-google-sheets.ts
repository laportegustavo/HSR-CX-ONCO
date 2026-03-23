import { getPatientsFromSheet, savePatientsToSheet, getFieldSchema, saveFieldSchema } from '../src/lib/google-sheets';

async function fixSheets() {
    try {
        console.log("Fetching patients...");
        const patients = await getPatientsFromSheet();
        let changed = false;
        
        for (const p of patients) {
            if (p.status === 'PERDA DE SEGMENTO') {
                p.status = 'PERDA DE SEGUIMENTO';
                changed = true;
            }
        }
        
        if (changed) {
            await savePatientsToSheet(patients);
            console.log("Updated patients with PERDA DE SEGUIMENTO.");
        } else {
            console.log("No patients had PERDA DE SEGMENTO.");
        }
        
        console.log("Fetching schema...");
        const schema = await getFieldSchema();
        let schemaChanged = false;
        
        for (const f of schema) {
            if (f.id === 'status' && f.options) {
                const idx = f.options.indexOf('PERDA DE SEGMENTO');
                if (idx !== -1) {
                    f.options[idx] = 'PERDA DE SEGUIMENTO';
                    schemaChanged = true;
                }
            }
        }
        
        if (schemaChanged) {
            await saveFieldSchema(schema);
            console.log("Updated schema options with PERDA DE SEGUIMENTO.");
        } else {
            console.log("No schema options had PERDA DE SEGMENTO.");
        }
        
    } catch (e) {
        console.error("Error updating sheets:", e);
    }
}

fixSheets().catch(console.error);
