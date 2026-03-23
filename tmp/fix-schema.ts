import { getFieldSchema, saveFieldSchema } from '../src/lib/google-sheets';

async function fix() {
    const schema = await getFieldSchema();
    const surgeryField = schema.find(f => f.id === 'surgeryDate');
    if (surgeryField) {
        surgeryField.isRequired = false;
        await saveFieldSchema(schema);
        console.log("Surgery date isRequired set to false!");
    } else {
        console.log("Surgery date field not found.");
    }
}

fix().catch(console.error);
