import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import * as UserController from "./user.controller.js";

const router = express.Router();

router.get("/stats", protect, restrictTo("admin"), UserController.getUserStats);
router
  .route("/")
  .get(protect, UserController.getUsers)
  .post(protect, restrictTo("admin"), UserController.createUsers);
router.patch("/change-password", protect, UserController.changePassword);

// /me routes must be declared BEFORE /:id to prevent "me" being matched as an ObjectId parameter
router.get("/me", protect, (req, res, next) => {
  req.params.id = req.user._id;
  UserController.getUser(req, res, next);
});
router.patch("/me", protect, (req, res, next) => {
  req.params.id = req.user._id;
  UserController.updateUser(req, res, next);
});

router
  .route("/:id")
  .get(protect, UserController.getUser)
  .patch(protect, UserController.updateUser)
  .delete(protect, UserController.deleteUser);
  
export default router;
