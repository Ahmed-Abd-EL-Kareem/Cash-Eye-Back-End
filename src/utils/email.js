import nodemailer from "nodemailer";

const sendWelcomeEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"Rahal" <${process.env.SMTP_USER || "noreply@rahal.travel"}>`,
    to,
    subject,
    html,
  });

  console.log("Email sent successfully:", info.messageId);
  return info;
};

const sendForgetEmail = async (option) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Rahal" <${process.env.SMTP_USER || "noreply@rahal.travel"}>`,
    to: option.email,
    subject: option.subject,
    html: option.message,
  });
};

export { sendForgetEmail, sendWelcomeEmail };
