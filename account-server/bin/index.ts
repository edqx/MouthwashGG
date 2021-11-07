import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

import { AccountServer } from "../src";

(async () => {
    const dotEnvLocation = path.resolve(process.cwd(), ".env");
    try {
        await fs.stat(dotEnvLocation);
    } catch (e) {
        try {
            await fs.writeFile(dotEnvLocation, `
POSTGRES_HOST="127.0.0.1:5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD=""
POSTGRES_DATABASE="Mouthwash"

INTERNAL_ACCESS_KEY=""
            `.trim(), "utf8");
        } catch (e) {
            console.log("Could not create .env file");
        }
    }

    dotenv.config();

    if (!process.env.POSTGRES_HOST) {
        console.log("Expected POSTGRES_HOST environment variable with hostName:port of the postgres database.");
        process.exit();
    }

    const [ hostName, port ] = process.env.POSTGRES_HOST.split(":");
    
    const a = new AccountServer({
        postgres: {
            host: hostName,
            port: parseInt(port),
            username: process.env.POSTGRES_USER!,
            password: process.env.POSTGRES_PASSWORD!,
            database: process.env.POSTGRES_DATABASE!
        },
        port: parseInt(process.env.PORT || "8000")
    });
    
    (async () => {
        await a.start();
    })();
})();