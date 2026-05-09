import dotenv from "dotenv";
dotenv.config();

console.log(process.env.GOOGLE_CLIENT_ID);

import passport from "passport";

import { Strategy as GoogleStrategy }
from "passport-google-oauth20";

import User from "../modules/users/user.model.js";


passport.use(

  new GoogleStrategy(

    {
      clientID: process.env.GOOGLE_CLIENT_ID,

      clientSecret:
      process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
      "/api/v1/auth/google/callback"

    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {

      try {

        let user = await User.findOne({

          email:
          profile.emails[0].value

        });

        if (!user) {

          user = await User.create({

            name: profile.displayName,

            email:
            profile.emails[0].value,

            googleId: profile.id

          });

        }

        done(null, user);

      } catch (error) {

        done(error, null);

      }

    }

  )

);

export default passport;