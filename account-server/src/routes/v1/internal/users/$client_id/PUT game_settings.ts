import express from "express";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    if (!req.body.game_settings) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'game_settings' as part of the json request body"
        });
    }

    if (!req.params.client_id) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'client_id' as part of request endpoint"
        });
    }
    
    const rowsUpdated = await server.postgresClient.query(`
        UPDATE users
        SET game_settings = $1
        WHERE client_id = $2
    `, [ req.body.game_settings, req.params.client_id ]);

    if (rowsUpdated.rowCount <= 0) {
        return res.status(404).json({
            code: 404,
            message: "NOT_FOUND",
            details: "User with that client id could not be found"
        });
    }

    return res.status(200).json({
        success: true,
        data: {}
    });
}