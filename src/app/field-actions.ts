"use server";

import { getFieldSchema as getFieldSchemaLib, saveFieldSchema as saveFieldSchemaLib } from "../lib/google-sheets";
import { FieldSchema } from "../types";
import { revalidatePath } from "next/cache";

export async function getFieldSchema() {
    return await getFieldSchemaLib();
}

export async function saveFieldSchema(schema: FieldSchema[]) {
    await saveFieldSchemaLib(schema);
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
}
