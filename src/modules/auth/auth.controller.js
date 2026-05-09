import { loginService } from "../auth/auth.service.js";
import generateToken from "../../utils/generateToken.js";
import sendCookie from "../../utils/sendCookie.js";

class AuthController {

  async login(req, res) {
    try {

      const { email, password } = req.body;

      const user = await loginService(email, password);

      const token = generateToken(user._id);

      sendCookie(res, token);

      return res.status(200).json({
        success: true,
        user
      });

    } catch (error) {

      return res.status(400).json({
        success: false,
        message: error.message
      });

    }
  }

  // ✅ ADD THIS
  async googleLogin(req, res) {
    res.send("Google login route working");
  }

  // ✅ ADD THIS
  async googleCallback(req, res) {
    try {

      // بعد ما ييجي من Google
      const user = req.user;

      const token = generateToken(user._id);

      sendCookie(res, token);

      res.redirect(process.env.CLIENT_URL);

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }
  }

}

export default new AuthController();