import express from "express";

const isStripeWebhook = (req) => req.originalUrl?.includes("/webhook");

const rawJsonParser = express.raw({ type: "application/json" });
const jsonParser = express.json();

// Stripe signature verification requires the exact raw bytes of the request body.
// express.json() parses and can leave req.rawBody unset — use raw parser for webhooks only.
export const stripeWebhookBodyParser = (req, res, next) => {
  if (!isStripeWebhook(req)) {
    return jsonParser(req, res, next);
  }

  rawJsonParser(req, res, (err) => {
    if (err) return next(err);
    req.rawBody = req.body;
    next();
  });
};

export const getStripeWebhookPayload = (req) => {
  const payload = req.rawBody ?? req.body;

  if (Buffer.isBuffer(payload)) return payload;
  if (typeof payload === "string" && payload.length > 0) return payload;

  return null;
};
