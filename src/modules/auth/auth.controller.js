import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  googleCallback,
} from "./auth.service.js";



const register = (req, res, next) => {
  return signup(req, res, next);
};

const loginUser = (req, res, next) => {
  return login(req, res, next);
};

const forgotPass = (req, res, next) => {
  return forgotPassword(req, res, next);
};

const resetPass = (req, res, next) => {
  return resetPassword(req, res, next);
};

const googleAuthCallback = (req, res, next) => {
  console.log(process.env.CLIENT_URL);

  return googleCallback(req, res, next);
};


export {
  register,
  loginUser,
  forgotPass,
  resetPass,
  googleAuthCallback,
};
