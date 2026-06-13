import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";
import UserModel from "./user.model.js";

export const getAllUsers = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    UserModel,
    UserModel.find().select("-__v"),
    req.query
  )
    .filter()
    .search(["name", "email"])
    .sort()
    .limitFields()
    .paginate();

  const [users, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  res.status(200).json({
    status: "success",
    results: users.length,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      pages: Math.ceil(total / features.limit),
    },
    data: { users },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await UserModel.createWithSubscription({
    name,
    email,
    password,
    role: "admin",
  });
  user.password = undefined;

  res.status(201).json({
    status: "success",
    data: { user },
  });
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.params.id).select("-__v");
  if (!user) {
    return next(new ApiError("No user found with this id", 404));
  }
  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const updateUserById = asyncHandler(async (req, res, next) => {
  const { name, image, preferredLanguage, preferredCurrency } = req.body;

  if (req.body.password) {
    return next(
      new ApiError(
        "This route is not for password updates. Use /auth/reset-password.",
        400
      )
    );
  }

  const user = await UserModel.findByIdAndUpdate(
    req.params.id,
    { name, image, preferredLanguage, preferredCurrency },
    { new: true, runValidators: true }
  ).select("-__v");

  if (!user) {
    return next(new ApiError("No user found with this id", 404));
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const deleteUserById = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new ApiError("No user found with this id", 404));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});
