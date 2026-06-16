import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = async (plain, hash) => bcrypt.compare(plain, hash);

export const hashOTP = async (otp) => bcrypt.hash(otp.toString(), 10);
