import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserModel from "../modules/users/user.model.js";
import { findOrCreateGoogleUser } from "../modules/auth/auth.service.js";

const googleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REDIRECT_URL;

if (googleConfigured) {
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

          const user = await findOrCreateGoogleUser({
            email,
            googleId: profile.id,
            displayName: profile.displayName,
            photoUrl: googlePhotoUrl,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else if (process.env.NODE_ENV === "development") {
  console.warn("[Passport] Google OAuth not configured — /auth/google routes disabled");
}

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    done(null, await UserModel.findById(id));
  } catch (err) {
    done(err, null);
  }
});

export default passport;
