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

const sendCookie = (res, token) => {
  res.cookie("token", token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: false,  // Change to false so Angular can read it
    secure: false,    // Must be false for localhost (HTTP)
    sameSite: "Lax",  // Change from "None" to "Lax" for localhost
  });
};
export default sendCookie;
