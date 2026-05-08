import { forgotPassword, resetPassword, signup } from "./auth.service.js";


const register = (req, res, next) => {
  return signup(req, res, next)
};

const forgotPass = (req, res) => {
  return forgotPassword(req, res)
};

const resetPass = (req, res) => {
  return resetPassword(req, res)
};

export { register, forgotPass, resetPass };