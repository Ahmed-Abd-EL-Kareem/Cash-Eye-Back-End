import nodemailer from "nodemailer";

const createBrevoTransport = () =>
  nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

const sendWelcomeEmail = async ({ to, subject, html }) => {
  const transporter = createBrevoTransport();
  const info = await transporter.sendMail({
    from: `"Rahal" <ahmed.20003.ayman@gmail.com>`, // verified individual sender
    to,
    subject,
    html,
  });
  console.log("Email sent successfully:", info.messageId);
  return info;
};

const sendForgetEmail = async (option) => {
  const transporter = createBrevoTransport();
  await transporter.sendMail({
    from: `"Rahal" <ahmed.20003.ayman@gmail.com>`, // verified individual sender
    to: option.email,
    subject: option.subject,
    html: option.message,
  });
};
export { sendForgetEmail, sendWelcomeEmail };