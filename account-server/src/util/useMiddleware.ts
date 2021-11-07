import express from "express";
import { AccountServer } from "../index";

export function useMiddleware(middleware: express.RequestHandler) {
    return function (_server: AccountServer, req: express.Request, res: express.Response) {
        return new Promise(resolve => {
            middleware(req, res, () => resolve(true));
        });
    }
}