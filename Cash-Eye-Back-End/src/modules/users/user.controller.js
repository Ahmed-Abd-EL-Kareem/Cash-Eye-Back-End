import {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "./user.service.js";

export const createUsers = (req, res, next) => createUser(req, res, next);

export const getUsers = (req, res, next) => getAllUsers(req, res, next);

export const getUser = (req, res, next) => getUserById(req, res, next);

export const updateUser = (req, res, next) => updateUserById(req, res, next);

export const deleteUser = (req, res, next) => deleteUserById(req, res, next);
