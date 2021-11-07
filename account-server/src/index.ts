import http from "http";
import express from "express";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

import pg from "pg";

import { AccountServerConfig } from "./interfaces";

export type RouteHandler = (server: AccountServer, req: express.Request, response: express.Response) => Promise<boolean|undefined>;

export interface ProcessedRoute {
    verb: string;
    route: string;
    handler: RouteHandler;
}

const verbColors: Record<string, chalk.ChalkFunction> = {
    "USE": chalk.grey,
    "GET": chalk.yellow,
    "POST": chalk.magenta,
    "DELETE": chalk.red
};

function normaliseEndpointName(baseRoute: string, endpointName: string) {
    if (endpointName === "index") {
        return baseRoute;
    }

    if (endpointName === "404") {
        return path.join(baseRoute, "*");
    }

    return path.join(baseRoute, endpointName);
}

export async function recursiveGetRoutes(baseRoute: string): Promise<ProcessedRoute[]> {
    const allRoutes: ProcessedRoute[] = [];

    const absolutePath = path.resolve(__dirname, "routes", baseRoute);
    const inDirectory = await fs.readdir(absolutePath);
    inDirectory.sort(fileName => fileName.startsWith("404") ? 1 : -1);
    
    for (const fileName of inDirectory) {
        if (fileName.startsWith("middleware")) {
            const { default: middlewares } = await import(path.join(absolutePath, fileName));

            for (const middleware of middlewares) {
                allRoutes.push({
                    verb: "USE",
                    route: baseRoute.replace(/\$(.+)/g, ":$1").replace(/\\/g, "/") + "*",
                    handler: middleware
                });
            }
        }
    }

    for (const fileName of inDirectory) {
        if (fileName.startsWith("_") || fileName === "middleware")
            continue;

        const pathname = path.resolve(absolutePath, fileName);
        const fileStat = await fs.stat(pathname);

        if (fileStat.isDirectory()) {
            allRoutes.push(...await recursiveGetRoutes(path.join(baseRoute, fileName) + "/"));
        } else {
            const [ httpVerb, endpointName ] = path.basename(path.basename(fileName, ".ts"), ".js").split(" ");

            if (!httpVerb || !endpointName)
                continue;

            const { default: routeHandler } = await import(pathname);
            
            allRoutes.push({
                verb: httpVerb,
                route: normaliseEndpointName(baseRoute, endpointName).replace(/\$(.+?)\/?/g, ":$1").replace(/\\/g, "/"),
                handler: routeHandler
            });
        }
    }

    return allRoutes;
}

export class AccountServer {
    expressServer: express.Express;
    httpServer?: http.Server;
    postgresClient: pg.Client;

    constructor(public readonly config: AccountServerConfig) {
        this.expressServer = express();

        this.postgresClient = new pg.Client({
            host: config.postgres.host,
            port: config.postgres.port,
            user: config.postgres.username,
            password: config.postgres.password,
            database: config.postgres.database
        });
    }
    
    private listen() {
        return new Promise<void>(resolve => {
            this.httpServer = this.expressServer.listen(this.config.port, "0.0.0.0");
            this.httpServer.once("listening", () => {
                resolve();
            });
        });
    }

    async start() {
        await this.postgresClient.connect();
        try {
            await this.postgresClient.query(
                `
                INSERT INTO users (client_id, email, password_hash, display_name, created_at, banned_until, muted_until, game_settings)
                VALUES ('29fb11a7-8ea1-466b-bb37-b59214fc8f85', 'essmale2005@gmail.com', '$2b$10$1RznMjCp2lU0sS86191/yONZEjsK1UDFGyqrU/LNzW2SvXvsBkNlm', 'femboy', '2021-11-06T12:22:20.788Z', NULL, NULL, '{}')
                `
            );
        } catch (e) {

        }

        const allRoutes = await recursiveGetRoutes("");
        for (const route of allRoutes) {
            this.expressServer[route.verb.toLowerCase() as keyof express.Express]("/api/" + route.route, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                const doNext = await route.handler(this, req, res);

                if (res.headersSent) {
                    console.log(`[${(verbColors[req.method] || chalk.grey)(route.verb)}] ${req.path} (${res.statusCode})`);
                } else if (doNext) {
                    next();
                }
            });
        }
        await this.listen();
    }
}