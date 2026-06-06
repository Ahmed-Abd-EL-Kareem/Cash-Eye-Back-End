import ApiError from "../utils/apiError.js";

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const message = `The ${field} is already in use. Please use another value!`;
  return new ApiError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  console.error("ERROR:", err);
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  console.error("ERROR:", err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong",
  });
};

export const globalErrorHandler = (err, req, res, next) => {
  let error = Object.assign(err, { message: err.message });

  if (error.code === 11000) error = handleDuplicateFieldsDB(error);

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "Error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

export default globalErrorHandler;
