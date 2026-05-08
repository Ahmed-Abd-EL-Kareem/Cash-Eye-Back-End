import express from "express";
import * as AuthController from "./auth.controller.js";

const router = express.Router();



router.post("/signup", AuthController.register);
router.post("/forgot-password", AuthController.forgotPass);
router.post("/reset-password", AuthController.resetPass);


export default router