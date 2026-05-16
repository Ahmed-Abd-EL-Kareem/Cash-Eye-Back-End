import { catchAsync } from "../../utils/catchAsync.js"
import AppError from "../../utils/appError.js"
import UserModel from "./user.model.js"

const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await UserModel.find()
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
})

const createUser = catchAsync(async (req, res, next) => {
  const user = await UserModel.create(req.body)
  res.status(201).json({ message: "User created", user })
})

const getUserById = catchAsync(async (req, res, next) => {
  const user = await UserModel.findById(req.params.id)
  if (!user) {
    return next(new AppError("No user found with this id", 404))
  }
  res.status(200).json({ message: "User found", user })
})

const updateUserById = catchAsync(async (req, res, next) => {
  const { name, image, password } = req.body
  const user = await UserModel.findByIdAndUpdate(req.params.id, { name, image, password }, { new: true })
  if (!user) {
    return next(new AppError("No user found with this id", 404))
  }
  res.status(200).json({ message: "User updated", user })
})

const deleteUserById = catchAsync(async (req, res, next) => {
  const user = await UserModel.findByIdAndDelete(req.params.id)
  if (!user) {
    return next(new AppError("No user found with this id", 404))
  }
  res.status(200).json({ message: "User deleted", user })
})

export { getAllUsers, createUser, getUserById, updateUserById, deleteUserById }