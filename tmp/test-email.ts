import { recoverPasswordAction } from "../src/app/staff-actions";

async function run() {
    console.log("Testing recover password action...");
    const result = await recoverPasswordAction("laporte", "Administrador");
    console.log("RESULT:", result);
}
run();
