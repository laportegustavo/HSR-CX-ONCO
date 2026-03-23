import { getFieldSchema, saveFieldSchema } from "../src/lib/google-sheets";
async function run() {
    const s = await getFieldSchema();
    const hasWait = s.find(f => f.id === 'waitTime');
    if (!hasWait) {
        s.push({
            id: 'waitTime',
            label: 'Tempo de Espera (Dias)',
            type: 'number',
            column: s.length,
            isVisibleInCalendar: false,
            isRequired: false,
            order: s.length,
            group: 'Procedimento',
            isSystem: true,
            isVisibleInForm: false // automatically calculated, no manual edit needed
        });
        await saveFieldSchema(s);
        console.log("Adicionado Tempo de Espera ao schema!");
    } else {
        console.log("Schema ja tem", hasWait);
    }
}
run();
