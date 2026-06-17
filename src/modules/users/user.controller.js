import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse, createdResponse } from "../../utils/apiResponse.js";
import * as userService from "./user.service.js";

export const getUsers = asyncHandler(async (req, res) => {
  const { users, total, page, limit } = await userService.getAllUsers(req.query);

  successResponse(res, {
    meta: {
      results: users.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
    data: { users },
  });
});

export const createUsers = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  createdResponse(res, {
    data: { user },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  successResponse(res, {
    data: { user },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUserById(req.params.id, req.body);

  successResponse(res, {
    data: { user },
  });

});
export const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user._id, req.body);

  res.status(200).json({
    status: "success",
    message: "Password changed successfully",
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUserById(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
