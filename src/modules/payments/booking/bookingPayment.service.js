import stripe from "../../../utils/stripe.js";
import BookingModel from "../../bookings/booking.model.js";
import UserModel from "../../users/user.model.js";
import ApiError from "../../../utils/apiError.js";
import logger from "../../../config/logger.js";

const getPaymentIntentId = (session) => {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
};

export const createBookingCheckoutSession = async (bookingId, userId, currency) => {
  const booking = await BookingModel.findById(bookingId)
    .populate("hotel", "name.en name.ar city stars coverImage images")
    .populate("trip", "title destination duration summary");

  if (!booking) throw new ApiError("Booking not found", 404);
  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError("Not authorized to pay for this booking", 403);
  }
  if (booking.paymentStatus === "succeeded") {
    throw new ApiError("Payment already processed for this booking", 400);
  }
  if (booking.status === "canceled") {
    throw new ApiError("Cannot pay for a canceled booking", 400);
  }

  const user = await UserModel.findById(userId).select("email name");
  const payCurrency = (currency || booking.currency || "EGP").toLowerCase();
  const amount = Math.round(booking.totalPrice * 100);

  const hotel = booking.hotel;
  const trip = booking.trip;
  const hotelName = hotel?.name?.en || hotel?.name || "Hotel booking";
  const hotelImages = (hotel?.coverImage ? [hotel.coverImage] : []).concat(hotel?.images || []).filter(Boolean).slice(0, 8);

  const productName = trip
    ? `${hotelName} + Trip: ${trip.title}`
    : `Hotel — ${hotelName}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user?.email,
    line_items: [
      {
        price_data: {
          currency: payCurrency,
          unit_amount: amount,
          product_data: {
            name: productName,
            description: `${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()} | ${booking.guests} guests | ${booking.rooms} rooms`,
            ...(hotelImages.length ? { images: hotelImages } : {}),
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.CLIENT_URL}/booking/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
    cancel_url: `${process.env.CLIENT_URL}/booking/payment/cancel?booking_id=${booking._id}`,
    metadata: {
      bookingId: booking._id.toString(),
      userId: userId.toString(),
      hotelName,
      tripTitle: trip?.title || "",
    },
    payment_intent_data: {
      metadata: {
        bookingId: booking._id.toString(),
        userId: userId.toString(),
      },
      description: `Rahal booking — ${hotelName}${trip ? ` + ${trip.title}` : ""}`.slice(0, 200),
    },
  });

  booking.paymentStatus = "processing";
  booking.stripeCheckoutSessionId = session.id;
  await booking.save();

  return {
    url: session.url,
    sessionId: session.id,
    amount,
    currency: payCurrency,
    bookingId: booking._id,
  };
};

export const handleWebhookEvent = async (payload, sig) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_BOOKING
    );
  } catch (err) {
    throw new ApiError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  logger.info(`[Stripe] Booking webhook received: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(event.data.object);
      break;
    }
    case "checkout.session.expired": {
      await handleCheckoutExpired(event.data.object);
      break;
    }
    case "payment_intent.succeeded": {
      await handleSuccessfulPayment(event.data.object);
      break;
    }
    case "payment_intent.payment_failed": {
      await handleFailedPayment(event.data.object);
      break;
    }
    case "charge.refunded": {
      await handleRefundedPayment(event.data.object);
      break;
    }
    default:
      console.log(`[Stripe] Unhandled booking event: ${event.type}`);
  }

  return { received: true };
};

const handleCheckoutCompleted = async (session) => {
  const holdId = session.metadata?.holdId;
  if (!holdId) {
    logger.warn(`[Stripe] checkout.session.completed missing holdId: ${session.id}`);
    return;
  }

  const hold = await BookingModel.findById(holdId);
  if (!hold) {
    logger.warn(`[Stripe] Hold not found: ${holdId}`);
    return;
  }

  if (session.payment_status !== "paid") {
    logger.warn(`[Stripe] Checkout session not paid: ${session.id}`);
    return;
  }

  if (hold.status !== "held") {
    logger.info(`[Stripe] Hold ${holdId} already in status ${hold.status}`);
    return;
  }

  const paymentIntentId = getPaymentIntentId(session);

  await BookingModel.updateOne(
    { _id: holdId, status: "held" },
    {
      $set: {
        status: "confirmed",
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: "succeeded",
        amountPaid: (session.amount_total || 0) / 100,
        currency: (session.currency || hold.currency).toUpperCase(),
        paidAt: new Date(),
      },
      $unset: { expiresAt: "" },
    }
  );

  logger.info(`[Stripe] Hold ${holdId} confirmed via checkout`);
};

const handleCheckoutExpired = async (session) => {
  const holdId = session.metadata?.holdId;
  if (!holdId) return;

  await BookingModel.deleteOne({ _id: holdId, status: "held" });
  logger.info(`[Stripe] Hold ${holdId} expired and released`);
};

const handleSuccessfulPayment = async (paymentIntent) => {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    console.warn(`[Stripe] Booking not found for payment ${paymentIntent.id}`);
    return;
  }

  if (booking.paymentStatus === "succeeded") return;

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
  const booking = await BookingModel.findOne({ paymentIntentId: charge.payment_intent });
  if (!booking) return;

  booking.paymentStatus = "refunded";
  booking.amountPaid = 0;
  await booking.save();
};

export const getPaymentStatus = async (bookingId, userId) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw new ApiError("Booking not found", 404);
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
    bookingStatus: booking.status,
  };
};

export const getRevenueStats = async () => {
  const bookings = await BookingModel.find({ status: { $in: ["confirmed", "completed"] } });
  let totalBookingRevenue = 0;
  bookings.forEach((b) => (totalBookingRevenue += b.totalPrice || 0));

  const { default: SubscriptionModel } = await import("../../subscriptions/subscription.model.js");
  const proCount = await SubscriptionModel.countDocuments({ planName: "pro" });
  const proRevenue = proCount * 20;

  return {
    totalBookingRevenue,
    proSubscriptionsRevenue: proRevenue,
    totalRevenue: totalBookingRevenue + proRevenue,
  };
};

export const getAverageBookingPrice = async () => {
  const bookings = await BookingModel.find({ status: { $in: ["confirmed", "completed"] } });
  if (!bookings.length) return { averageBookingPrice: 0 };
  const total = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  return { averageBookingPrice: total / bookings.length };
};

export const getCancelledBookingsCount = async () => {
  const count = await BookingModel.countDocuments({ status: "canceled" });
  return { cancelledBookings: count };
};