import express from "express";

import{creatuser,getAllusers,getuserBYid, updateuserBYid}from"../Users/controller/User.controller.js"

const router = express.Router()

router.get("/",getAllusers)
router.post("/",creatuser)
router.get("/:id",getuserBYid)
router.patch("/:id",updateuserBYid)
export default router