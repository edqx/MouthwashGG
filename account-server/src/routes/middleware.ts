import express from "express";
import { useMiddleware } from "../util/useMiddleware";

export default [
    useMiddleware(express.json())
];