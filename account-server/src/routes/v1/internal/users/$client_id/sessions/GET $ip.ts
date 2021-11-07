import express from "express";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    if (!req.params.client_id) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'client_id' as part of request endpoint"
        });
    }

    if (!req.params.ip) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'ip' as part of request endpoint"
        });
    }
    
    const { rows: foundSessions } = await server.postgresClient.query(`
        SELECT * 
        FROM sessions
        WHERE client_id = $1
        AND ip = $2
    `, [ req.params.client_id, req.params.ip ]);

    const session = foundSessions?.[0];

    if (!session) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "No session with that client_id and ip was found"
        });
        return;
    }

    return res.status(200).json({
        success: true,
        data: {
            client_id: session.client_id,
            client_token: session.client_token || ""
        }
    });
}