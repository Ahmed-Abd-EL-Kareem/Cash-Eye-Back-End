import jwt from "jsonwebtoken";

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

/** Default export — same behavior as legacy generateToken */
const generateToken = signToken;
export default generateToken;
