// const sendCookie = (res, token) => {
//   res.cookie("token", token, {
//     expires: new Date(
//       Date.now() + 7 * 24 * 60 * 60 * 1000
//     ),
//     httpOnly: true,
//     secure: true,
//     sameSite: "None",
//   });
// };

res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
export default sendCookie;
