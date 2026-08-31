import "dotenv/config";
import { environmentErrors } from "../src/lib/environment";

const errors = environmentErrors();
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log("Configuración validada sin exponer secretos.");
