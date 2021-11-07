import crypto from "crypto";

import express from "express";
import bcrypt from "bcrypt";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    const ip = req.header("X-Forwarded-For") || req.connection.remoteAddress;

    if (!req.body.email) {
        res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'email' as part of the json request body"
        });
        return;
    }

    if (!req.body.password) {
        res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'password' as part of the json request body"
        });
        return;
    }

    const { rows: foundUsers } = await server.postgresClient.query(`
        SELECT * 
        FROM users
        WHERE email = $1
    `, [ req.body.email ]);

    const user = foundUsers?.[0];

    if (!user) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "No user with that email was found"
        });
        return;
    }

    const passwordMatches = await bcrypt.compare(req.body.password, user.password_hash);

    if (!passwordMatches) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "Invalid credentials"
        });
        return;
    }

    const { rows: foundSessions } = await server.postgresClient.query(`
        SELECT * 
        FROM sessions
        WHERE client_id = $1
        AND ip = $2
    `, [ user.client_id, ip ]);

    const session = foundSessions?.[0];
    let clientToken = session?.client_token;

    if (!session) {
        const randomBytes = crypto.randomBytes(20);
        const sha256Hash = crypto.createHash("sha256").update(randomBytes).digest("hex");
        
        await server.postgresClient.query(`
            INSERT INTO sessions (client_id, client_token, ip)
            VALUES ($1, $2, $3)
        `, [ user.client_id, sha256Hash, ip ]);

        clientToken = sha256Hash;
    }

    return res.status(200).json({
        success: true,
        data: {
            client_id: user.client_id,
            client_token: clientToken,
            email: user.email,
            display_name: user.display_name,
            created_at: user.created_at,
            banned_until: user.banned_until,
            muted_until: user.muted_until
        }
    });
}