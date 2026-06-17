import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import * as UserController from "./user.controller.js";

const router = express.Router();

router
  .route("/")
  .get(protect, UserController.getUsers)
  .post(protect, restrictTo("admin"), UserController.createUsers);
  
  router
  .route("/:id")
  .get(protect, UserController.getUser)
  .patch(protect, UserController.updateUser)
  .delete(protect, UserController.deleteUser);
  
  router.patch("/change-password", protect, UserController.changePassword);
export default router;
