import crypto from "crypto";

import express from "express";
import bcrypt from "bcrypt";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    const clientId = req.header("Client-ID");
    const clientToken = req.header("Authorization");

    if (!clientId) {
        res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'Client-ID' as part of the request headers"
        });
        return;
    }

    if (!clientToken) {
        res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'Authorization' as part of the request headers"
        });
        return;
    }

    const { rows: foundSessions } = await server.postgresClient.query(`
        DELETE
        FROM sessions
        WHERE client_id = $1
        AND client_token = $2
    `, [ clientId, clientToken.split(" ")[1] ]);

    const session = foundSessions?.[0];

    if (!session) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "No session with that client_id and client_token was found"
        });
        return;
    }

    return res.status(200).json({
        success: true,
        data: {}
    });
}