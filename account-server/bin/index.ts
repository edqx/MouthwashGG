import dotenv from "dotenv";
dotenv.config();

import { AccountServer } from "../src";

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
    port: 8000
});

(async () => {
    await a.start();
})();