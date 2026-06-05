import stripe from "../../../utils/stripe.js";
import BookingModel from "../../bookings/booking.model.js";
import ApiError from "../../../utils/apiError.js";

export const createPaymentIntent = async (bookingId, userId, currency = "usd") => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError("Not authorized to pay for this booking", 403);
  }

  if (booking.paymentStatus === "succeeded") {
    throw new ApiError("Payment already processed for this booking", 400);
  }

  const amount = Math.round(booking.totalPrice * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { bookingId: booking._id.toString() },
  });

  booking.paymentIntentId = paymentIntent.id;
  booking.paymentStatus = "processing";
  await booking.save();

  return {
    clientSecret: paymentIntent.client_secret,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    paymentIntentId: paymentIntent.id,
  };
};

export const handleWebhookEvent = async (payload, sig) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new ApiError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await handleSuccessfulPayment(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handleFailedPayment(event.data.object);
      break;
    case "charge.refunded":
      await handleRefundedPayment(event.data.object);
      break;
    default:
      console.log(`[Stripe] Unhandled booking event: ${event.type}`);
  }

  return { received: true };
};

const handleSuccessfulPayment = async (paymentIntent) => {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    console.warn(`[Stripe] Booking not found for payment ${paymentIntent.id}`);
    return;
  }

  booking.paymentStatus = "succeeded";
  booking.paymentIntentId = paymentIntent.id;
  booking.paymentMethod = paymentIntent.payment_method_types?.[0] || null;
  booking.amountPaid = paymentIntent.amount / 100;
  booking.currency = paymentIntent.currency?.toUpperCase() || booking.currency;
  booking.paidAt = new Date(paymentIntent.created * 1000);
  booking.status = "confirmed";
  await booking.save();
};

const handleFailedPayment = async (paymentIntent) => {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await BookingModel.findById(bookingId);
  if (!booking) return;

  booking.paymentStatus = "failed";
  booking.paymentIntentId = paymentIntent.id;
  if (paymentIntent.last_payment_error) {
    booking.failureReason = paymentIntent.last_payment_error.message;
  }
  await booking.save();
};

const handleRefundedPayment = async (charge) => {
  const booking = await BookingModel.findOne({
    paymentIntentId: charge.payment_intent,
  });
  if (!booking) return;

  booking.paymentStatus = "refunded";
  booking.amountPaid = 0;
  await booking.save();
};

export const getPaymentStatus = async (bookingId, userId) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError("Not authorized to view this booking payment", 403);
  }

  return {
    bookingId: booking._id,
    paymentStatus: booking.paymentStatus,
    amountPaid: booking.amountPaid,
    currency: booking.currency,
    paidAt: booking.paidAt,
    failureReason: booking.failureReason || null,
  };
};
