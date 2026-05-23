import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserModel from "../modules/users/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email returned from Google"), null);

        const googlePhotoUrl = profile.photos?.[0]?.value || null;

        let user = await UserModel.findOne({ email });

        if (!user) {
          user = await UserModel.createWithSubscription({
            name: profile.displayName,
            email,
            googleId: profile.id,
            image: googlePhotoUrl,
            provider: "google",
          });
        } else {
          let changed = false;
          if (!user.googleId) {
            user.googleId = profile.id;
            changed = true;
          }
          if (!user.image && googlePhotoUrl) {
            user.image = googlePhotoUrl;
            changed = true;
          }
          if (changed) await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    done(null, await UserModel.findById(id));
  } catch (err) {
    done(err, null);
  }
});

export default passport;
