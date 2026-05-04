import express from "express";

import{creatuser,getAllusers,getuserBYid, updateuserBYid,deleteuserBYid}from"../Users/controller/User.controller.js"

const router = express.Router()
router.route("/").get(getAllusers).post(creatuser)
router.route("/:id").get(getuserBYid).patch(updateuserBYid).delete(deleteuserBYid)
// router.get("/",getAllusers)
// router.post("/",creatuser)
// router.get("/:id",getuserBYid)
// router.patch("/:id",updateuserBYid)
// router.delete("/:id",deleteuserBYid)
export default router