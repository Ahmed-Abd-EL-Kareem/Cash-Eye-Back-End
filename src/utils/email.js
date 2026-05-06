

import nodemailer from "nodemailer";

export const sendEmail = async (option) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const emailOptions = {
    from: process.env.EMAIL_USER,
    to: option.email,
    subject: option.subject,
    html: option.message,
  };
  await transporter.sendMail(emailOptions);
};