import express from "express";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    return res.status(404).json({
        code: 404,
        message: "NOT_FOUND",
        details: "A resource at that location could not be found"
    });
}