import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Stripe] STRIPE_SECRET_KEY is not set — payment features will fail");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

export default stripe;

// import Stripe from "stripe";

// const SECRET_KEY =
//   process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_development";

// if (!process.env.STRIPE_SECRET_KEY) {
//   console.warn("[Stripe] Using fallback dummy key — payment features are disabled");
// }

// const stripe = new Stripe(SECRET_KEY, {
//   apiVersion: "2024-11-20.acacia",
// });

// export default stripe;
