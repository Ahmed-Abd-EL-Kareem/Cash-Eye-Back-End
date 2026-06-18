import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";
import UserModel from "./user.model.js";

export const getAllUsers = async (query) => {
  const features = new APIFeatures(
    UserModel,
    UserModel.find().select("-__v"),
    query
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

  return {
    users,
    total,
    page: features.page,
    limit: features.limit,
  };
};

export const createUser = async ({ name, email, password }) => {
  const user = await UserModel.createWithSubscription({
    name,
    email,
    password,
    role: "admin",
  });
  user.password = undefined;
  return user;
};

export const getUserById = async (id) => {
  const user = await UserModel.findById(id).select("-__v");
  if (!user) throw new ApiError("No user found with this id", 404);
  return user;
};

export const updateUserById = async (id, data) => {
  const { name, image, preferredLanguage, preferredCurrency } = data;

  if (data.password) {
    throw new ApiError(
      "This route is not for password updates. Use /auth/reset-password.",
      400
    );
  }

  const user = await UserModel.findByIdAndUpdate(
    id,
    { name, image, preferredLanguage, preferredCurrency },
    { new: true, runValidators: true }
  ).select("-__v");

  if (!user) throw new ApiError("No user found with this id", 404);
  return user;
};

export const changePassword = async (id, { currentPassword, newPassword }) => {
  const user = await UserModel.findById(id).select("+password");
  if (!user) throw new ApiError("No user found with this id", 404);

  const isMatch = await user.correctPassword(currentPassword);
  if (!isMatch) throw new ApiError("Current password is incorrect", 401);

  user.password = newPassword;
  await user.save();
};
export const deleteUserById = async (id) => {
  const user = await UserModel.findByIdAndDelete(id);
  if (!user) throw new ApiError("No user found with this id", 404);
  return user;
};
