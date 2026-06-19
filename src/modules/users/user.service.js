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

export const getUserStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const calcGrowth = (current, previous) => {
    if (!previous) return 100;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  };

  const [
    totalUsers,
    totalUsersLastMonth,
    thisMonthUsers,
    lastMonthUsers,
  ] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ createdAt: { $lte: endOfLastMonth } }),
    UserModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    UserModel.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
  ]);

  const [premiumCount, lastMonthPremiumCount] = await Promise.all([
    UserModel.aggregate([
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "sub",
        },
      },
      { $unwind: "$sub" },
      { $match: { "sub.status": { $in: ["active", "trialing"] } } },
      { $count: "total" },
    ]),
    UserModel.aggregate([
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "sub",
        },
      },
      { $unwind: "$sub" },
      {
        $match: {
          "sub.status": { $in: ["active", "trialing"] },
          "sub.createdAt": { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $count: "total" },
    ]),
  ]);

  return {
    totalUsers,
    usersGrowth: calcGrowth(totalUsers, totalUsersLastMonth),
    activeUsers: thisMonthUsers,
    activeUsersGrowth: calcGrowth(thisMonthUsers, lastMonthUsers),
    premiumUsers: premiumCount[0]?.total || 0,
    premiumGrowth: calcGrowth(
      premiumCount[0]?.total || 0,
      lastMonthPremiumCount[0]?.total || 0
    ),
  };
};