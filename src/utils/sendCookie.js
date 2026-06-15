// const sendCookie = (res, token) => {
//   res.cookie("token", token, {
//     expires: new Date(
//       Date.now() + 7 * 24 * 60 * 60 * 1000
//     ),
//     httpOnly: true,
//     secure: true,
//     sameSite: "None"
//   });
// };

// export default sendCookie;
const sendCookie = (res, token) => {

  const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  res.cookie("token", token, {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,

    secure: !isDevelopment, 
    sameSite: isDevelopment ? "Lax" : "None"
  });
};

export default sendCookie;