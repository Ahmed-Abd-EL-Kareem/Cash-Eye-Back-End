<<<<<<< HEAD
import { catchAsync } from "../../utils/catchAsync.js"
import AppError from "../../utils/appError.js"
import UserModel from "./user.model.js"

const getAllUsers = catchAsync(async (req, res) => {
  let user = await UserModel.find()
})

const createUser = catchAsync(async (req, res) => {
  let user = await UserModel.create(req.body)
  res.status(201).json({ message: "User created", user })
})

const getUserById = catchAsync(async (req, res) => {
  let user = await UserModel.findById(req.params.id)
  if (!user) {
    return next(new AppError("No user found with this id", 404))
  }
  res.status(200).json({ message: "User found", user })
}
)

const updateUserById = catchAsync(async (req, res) => {
  let { name, image, password } = req.body
  let user = await UserModel.findByIdAndUpdate(req.params.id, { name, image, password }, { new: true })
  if (!user) {
    return next(new AppError("No user found with this id", 404))
  }
  res.status(200).json({ message: "User updated", user })
}
)
const deleteUserById = catchAsync(async (req, res) => {
  let user = await UserModel.findByIdAndDelete(req.params.id)
  if (!user) {
    return next(new AppError("No user found with this id", 404))
  }
  res.status(200).json({ message: "User deleted", user })
}
)

export default {
  getAllUsers,
  createUser,
  getUserById,
  updateUserById,
  deleteUserById
}
=======
import { createUser, getAllUsers, getUserById, updateUserById, deleteUserById } from "./user.service.js";
const createUsers = (req, res, next) => {
  return createUser(req, res, next)
};

const getUsers = (req, res, next) => {
  return getAllUsers(req, res, next)
};

const getUser = (req, res, next) => {
  return getUserById(req, res, next)
}

const updateUser = (req, res, next) => {
  return updateUserById(req, res, next)
}

const deleteUser = (req, res, next) => {
  return deleteUserById(req, res, next)
}
export { createUsers, getUsers, getUser, updateUser, deleteUser }
>>>>>>> 63d9c01 (Add Subscription & SignUp)
