import express from "express";
import { AccountServer } from "$/index";

export default [
    async function (server: AccountServer, req: express.Request, res: express.Response) {
        const authHeader = req.header("Authorization");
        if (authHeader) {
            const [ authType, authToken ] = authHeader.split(" ");
            if (authType !== "Bearer" || process.env.INTERNAL_ACCESS_KEY !== authToken) {
                res.status(403).json({
                    code: 403,
                    message: "FORBIDDEN",
                    details: "You are forbidden from accessing this resource"
                });
                return;
            }
        }
        return true;
    }
]