const allowedOrigins = [
  "https://rahal-main-site.vercel.app/",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.DASHBOARD_URL,
  process.env.FRONTEND_PROD_URL,
  process.env.DASHBOARD_PROD_URL,
].filter(Boolean);
console.log("Client",  process.env.CLIENT_URL)
console.log("Prod",  process.env.FRONTEND_PROD_URL)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server / Postman / Stripe redirects with no Origin header
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

export default corsOptions;
