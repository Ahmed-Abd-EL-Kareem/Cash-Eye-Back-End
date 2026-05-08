

import nodemailer from "nodemailer";

<<<<<<< HEAD
export const sendEmail = async (option) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
=======
// ! Send Welcome Email
const sendWelcomeEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
    });

    const info = await transporter.sendMail({
      from: `"CashEye AI" <casheye@ai.com>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);

    return info;

  } catch (error) {
    console.log("Email error:", error.message);
    throw error;
  }
};

// ! Forgot Password Email
const sendForgetEmail = async (option) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
>>>>>>> 63d9c01 (Add Subscription & SignUp)
    },
  });

  const emailOptions = {
<<<<<<< HEAD
    from: process.env.EMAIL_USER,
=======
    from: `"CashEye AI" <casheye@ai.com>`,
>>>>>>> 63d9c01 (Add Subscription & SignUp)
    to: option.email,
    subject: option.subject,
    html: option.message,
  };
  await transporter.sendMail(emailOptions);
<<<<<<< HEAD
};
=======
};

export { sendForgetEmail, sendWelcomeEmail };
>>>>>>> 63d9c01 (Add Subscription & SignUp)
