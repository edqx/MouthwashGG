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
        SELECT * 
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

    const { rows: foundUsers } = await server.postgresClient.query(`
        SELECT *
        FROM users
        WHERE client_id = $1
    `, [ session.client_id ]);
    
    const user = foundUsers?.[0];

    if (!user) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "No user with that client_id was found"
        });
        return;
    }

    return res.status(200).json({
        success: true,
        data: {
            client_id: user.client_id,
            client_token: session.client_token,
            email: user.email,
            display_name: user.display_name,
            created_at: user.created_at,
            banned_until: user.banned_until,
            muted_until: user.muted_until
        }
    });
}