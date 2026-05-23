import morgan from "morgan";

export const devLogger = morgan("dev");

export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    return devLogger(req, res, next);
  }
  return next();
};

export default requestLogger;
