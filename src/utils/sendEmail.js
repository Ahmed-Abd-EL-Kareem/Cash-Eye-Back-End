// import nodemailer from "nodemailer";

// const sendEmail = async ({ to, subject, text }) => {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   await transporter.sendMail({
//     from: "CashEye AI",
//     to,
//     subject,
//     text,
//   });
// };

// export default sendEmail;
import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"CashEye AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("Email sent successfully:", info.messageId);

    return info;

  } catch (error) {
    console.log("Email error:", error.message);
    throw error; // مهم عشان الـ controller يعرف إن في مشكلة
  }
};

export default sendEmail;