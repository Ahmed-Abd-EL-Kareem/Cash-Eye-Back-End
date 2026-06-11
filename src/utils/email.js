import nodemailer from "nodemailer";

const createGmailTransport = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendWelcomeEmail = async ({ to, subject, html }) => {
  const transporter = createGmailTransport();

  const info = await transporter.sendMail({
    from: `"Rahal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log("Email sent successfully:", info.messageId);
  return info;
};

const sendForgetEmail = async (option) => {
  const transporter = createGmailTransport();

  await transporter.sendMail({
    from: `"Rahal" <${process.env.SMTP_USER}>`,
    to: option.email,
    subject: option.subject,
    html: option.message,
  });
};

export { sendForgetEmail, sendWelcomeEmail };