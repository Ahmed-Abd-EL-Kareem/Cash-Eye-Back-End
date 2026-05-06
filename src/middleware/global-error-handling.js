import AppError from "../utils/appError.js";
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const message = `The ${field} is already in use. Please use another value!`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  console.error("ERROR 💥💥💥: ", err);
  // Send response for all routes
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
}

export const globalErrorHandler = (err, req, res, next) => {
  let error = Object.assign(err, { message: err.message });

  if (error.code === 11000) error = handleDuplicateFieldsDB(error);

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "Error";

  sendErrorDev(error, req, res);
}