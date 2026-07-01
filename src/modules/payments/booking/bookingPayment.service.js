// import stripe from "../../../utils/stripe.js";
// import BookingModel from "../../bookings/booking.model.js";
// import UserModel from "../../users/user.model.js";
// import ApiError from "../../../utils/apiError.js";
// import logger from "../../../config/logger.js";

// const getPaymentIntentId = (session) => {
//   const pi = session.payment_intent;
//   if (!pi) return null;
//   return typeof pi === "string" ? pi : pi.id;
// };

// const formatDate = (date) =>
//   new Date(date).toLocaleDateString("en-GB", {
//     day: "numeric",
//     month: "short",
//     year: "numeric",
//   });

// const toStripeImages = (...urls) =>
//   [...new Set(urls.filter((u) => typeof u === "string" && u.startsWith("https://")))].slice(
//     0,
//     8
//   );

// const buildBookingCheckoutDescription = (booking) => {
//   const hotel = booking.hotel;
//   const trip = booking.trip;
//   const nights = Math.ceil(
//     (new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
//   );

//   const parts = [
//     hotel?.stars ? `${hotel.stars}-star hotel` : null,
//     hotel?.city ? `City: ${hotel.city}` : null,
//     `Check-in: ${formatDate(booking.checkIn)} · Check-out: ${formatDate(booking.checkOut)}`,
//     `${nights} night${nights !== 1 ? "s" : ""} · ${booking.guests} guest${booking.guests !== 1 ? "s" : ""} · ${booking.rooms} room${booking.rooms !== 1 ? "s" : ""}`,
//     trip
//       ? `Linked trip: ${trip.title} — ${trip.destination} (${trip.duration} days)`
//       : null,
//     trip?.summary ? trip.summary.slice(0, 120) : null,
//     booking.specialRequests ? `Requests: ${booking.specialRequests}` : null,
//   ].filter(Boolean);

//   return parts.join(" · ").slice(0, 500);
// };

// const fulfillBookingFromCheckout = async (session) => {
//   const { bookingId, userId } = session.metadata || {};

//   if (!bookingId) {
//     logger.warn(`[Stripe] checkout.session.completed missing bookingId: ${session.id}`);
//     return null;
//   }

//   if (session.payment_status !== "paid") {
//     logger.warn(`[Stripe] Checkout session not paid: ${session.id}`);
//     return null;
//   }

//   const booking = await BookingModel.findById(bookingId);
//   if (!booking) {
//     logger.warn(`[Stripe] Booking not found: ${bookingId}`);
//     return null;
//   }

//   if (booking.paymentStatus === "succeeded") {
//     return booking;
//   }

//   const paymentIntentId = getPaymentIntentId(session);

//   booking.paymentStatus = "succeeded";
//   if (paymentIntentId) booking.paymentIntentId = paymentIntentId;
//   booking.amountPaid = (session.amount_total || 0) / 100;
//   booking.currency = (session.currency || booking.currency).toUpperCase();
//   booking.paidAt = new Date();
//   booking.status = "confirmed";
//   await booking.save();

//   logger.info(`[Stripe] Booking ${bookingId} payment confirmed via checkout`);

//   if (userId && booking.user.toString() !== userId) {
//     logger.warn(`[Stripe] Checkout userId mismatch for booking ${bookingId}`);
//   }

//   return booking;
// };

// const validateBookingForPayment = async (bookingId, userId) => {
//   const booking = await BookingModel.findById(bookingId)
//     .populate("hotel", "name.en name.ar city stars coverImage images")
//     .populate("trip", "title destination duration summary");

//   if (!booking) throw new ApiError("Booking not found", 404);

//   if (booking.user.toString() !== userId.toString()) {
//     throw new ApiError("Not authorized to pay for this booking", 403);
//   }

//   if (booking.paymentStatus === "succeeded") {
//     throw new ApiError("Payment already processed for this booking", 400);
//   }

//   if (booking.status === "canceled") {
//     throw new ApiError("Cannot pay for a canceled booking", 400);
//   }

//   return booking;
// };

// export const createBookingCheckoutSession = async (
//   bookingId,
//   userId,
//   currency
// ) => {
//   const booking = await validateBookingForPayment(bookingId, userId);
//   const user = await UserModel.findById(userId).select("email name");

//   const payCurrency = (currency || booking.currency || "EGP").toLowerCase();
//   const amount = Math.round(booking.totalPrice * 100);

//   const hotel = booking.hotel;
//   const trip = booking.trip;
//   const hotelName = hotel?.name?.en || hotel?.name || "Hotel booking";
//   const hotelImages = toStripeImages(hotel?.coverImage, ...(hotel?.images || []));

//   const productName = trip
//     ? `${hotelName} + Trip: ${trip.title}`
//     : `Hotel — ${hotelName}`;

//   const session = await stripe.checkout.sessions.create({
//     mode: "payment",
//     customer_email: user?.email,
//     line_items: [
//       {
//         price_data: {
//           currency: payCurrency,
//           unit_amount: amount,
//           product_data: {
//             name: productName,
//             description: buildBookingCheckoutDescription(booking),
//             ...(hotelImages.length ? { images: hotelImages } : {}),
//           },
//         },
//         quantity: 1,
//       },
//     ],
//     success_url: `${process.env.FRONTEND_URL}/booking/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
//     cancel_url: `${process.env.FRONTEND_URL}/booking/payment/cancel?booking_id=${booking._id}`,
//     custom_text: {
//       submit: {
//         message: trip
//           ? `Confirm payment for ${hotelName} + trip "${trip.title}"`
//           : `Confirm payment for your stay at ${hotelName}`,
//       },
//     },
//     metadata: {
//       bookingId: booking._id.toString(),
//       userId: userId.toString(),
//       hotelName,
//       tripTitle: trip?.title || "",
//     },
//     payment_intent_data: {
//       metadata: {
//         bookingId: booking._id.toString(),
//         userId: userId.toString(),
//       },
//       description: `Rahal booking — ${hotelName}${trip ? ` + ${trip.title}` : ""}`.slice(
//         0,
//         200
//       ),
//     },
//   });

//   booking.paymentStatus = "processing";
//   await booking.save();

//   return {
//     url: session.url,
//     sessionId: session.id,
//     amount,
//     currency: payCurrency,
//     bookingId: booking._id,
//   };
// };

// export const handleWebhookEvent = async (payload, sig) => {
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       payload,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     throw new ApiError(`Webhook signature verification failed: ${err.message}`, 400);
//   }

//   logger.info(`[Stripe] Booking webhook received: ${event.type}`);

//   switch (event.type) {
//     case "checkout.session.completed":
//       await fulfillBookingFromCheckout(event.data.object);
//       break;
//     case "payment_intent.succeeded":
//       await handleSuccessfulPayment(event.data.object);
//       break;
//     case "payment_intent.payment_failed":
//       await handleFailedPayment(event.data.object);
//       break;
//     case "charge.refunded":
//       await handleRefundedPayment(event.data.object);
//       break;
//     default:
//       console.log(`[Stripe] Unhandled booking event: ${event.type}`);
//   }

//   return { received: true };
// };

// const handleSuccessfulPayment = async (paymentIntent) => {
//   const bookingId = paymentIntent.metadata?.bookingId;
//   if (!bookingId) return;

//   const booking = await BookingModel.findById(bookingId);
//   if (!booking) {
//     console.warn(`[Stripe] Booking not found for payment ${paymentIntent.id}`);
//     return;
//   }

//   if (booking.paymentStatus === "succeeded") return;

//   booking.paymentStatus = "succeeded";
//   booking.paymentIntentId = paymentIntent.id;
//   booking.paymentMethod = paymentIntent.payment_method_types?.[0] || null;
//   booking.amountPaid = paymentIntent.amount / 100;
//   booking.currency = paymentIntent.currency?.toUpperCase() || booking.currency;
//   booking.paidAt = new Date(paymentIntent.created * 1000);
//   booking.status = "confirmed";
//   await booking.save();
// };

// const handleFailedPayment = async (paymentIntent) => {
//   const bookingId = paymentIntent.metadata?.bookingId;
//   if (!bookingId) return;

//   const booking = await BookingModel.findById(bookingId);
//   if (!booking) return;

//   booking.paymentStatus = "failed";
//   booking.paymentIntentId = paymentIntent.id;
//   if (paymentIntent.last_payment_error) {
//     booking.failureReason = paymentIntent.last_payment_error.message;
//   }
//   await booking.save();
// };

// const handleRefundedPayment = async (charge) => {
//   const booking = await BookingModel.findOne({
//     paymentIntentId: charge.payment_intent,
//   });
//   if (!booking) return;

//   booking.paymentStatus = "refunded";
//   booking.amountPaid = 0;
//   await booking.save();
// };

// export const getPaymentStatus = async (bookingId, userId) => {
//   const booking = await BookingModel.findById(bookingId);
//   if (!booking) {
//     throw new ApiError("Booking not found", 404);
//   }

//   if (booking.user.toString() !== userId.toString()) {
//     throw new ApiError("Not authorized to view this booking payment", 403);
//   }

//   return {
//     bookingId: booking._id,
//     paymentStatus: booking.paymentStatus,
//     amountPaid: booking.amountPaid,
//     currency: booking.currency,
//     paidAt: booking.paidAt,
//     failureReason: booking.failureReason || null,
//     bookingStatus: booking.status,
//   };
// };
// ? //////////////////////////////////
import stripe from "../../../utils/stripe.js";
import BookingModel from "../../bookings/booking.model.js";
import UserModel from "../../users/user.model.js";
import ApiError from "../../../utils/apiError.js";
import logger from "../../../config/logger.js";
// update==================
import SubscriptionModel from "../../subscriptions/subscription.model.js";

const getPaymentIntentId = (session) => {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const toStripeImages = (...urls) =>
  [...new Set(urls.filter((u) => typeof u === "string" && u.startsWith("https://")))].slice(
    0,
    8
  );

const buildBookingCheckoutDescription = (booking) => {
  const hotel = booking.hotel;
  const trip = booking.trip;
  const nights = Math.ceil(
    (new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
  );

  const parts = [
    hotel?.stars ? `${hotel.stars}-star hotel` : null,
    hotel?.city ? `City: ${hotel.city}` : null,
    `Check-in: ${formatDate(booking.checkIn)} · Check-out: ${formatDate(booking.checkOut)}`,
    `${nights} night${nights !== 1 ? "s" : ""} · ${booking.guests} guest${booking.guests !== 1 ? "s" : ""} · ${booking.rooms} room${booking.rooms !== 1 ? "s" : ""}`,
    trip
      ? `Linked trip: ${trip.title} — ${trip.destination} (${trip.duration} days)`
      : null,
    trip?.summary ? trip.summary.slice(0, 120) : null,
    booking.specialRequests ? `Requests: ${booking.specialRequests}` : null,
  ].filter(Boolean);

  return parts.join(" · ").slice(0, 500);
};

const fulfillBookingFromCheckout = async (session) => {
  const { bookingId, userId } = session.metadata || {};

  if (!bookingId) {
    logger.warn(`[Stripe] checkout.session.completed missing bookingId: ${session.id}`);
    return null;
  }

  if (session.payment_status !== "paid") {
    logger.warn(`[Stripe] Checkout session not paid: ${session.id}`);
    return null;
  }

  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    logger.warn(`[Stripe] Booking not found: ${bookingId}`);
    return null;
  }

  if (booking.paymentStatus === "succeeded") {
    return booking;
  }

  const paymentIntentId = getPaymentIntentId(session);

  booking.paymentStatus = "succeeded";
  if (paymentIntentId) booking.paymentIntentId = paymentIntentId;
  booking.amountPaid = (session.amount_total || 0) / 100;
  booking.currency = (session.currency || booking.currency).toUpperCase();
  booking.paidAt = new Date();
  booking.status = "confirmed";
  await booking.save();

  logger.info(`[Stripe] Booking ${bookingId} payment confirmed via checkout`);

  if (userId && booking.user.toString() !== userId) {
    logger.warn(`[Stripe] Checkout userId mismatch for booking ${bookingId}`);
  }

  return booking;
};

const validateBookingForPayment = async (bookingId, userId) => {
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

  return booking;
};

export const createBookingCheckoutSession = async (
  bookingId,
  userId,
  currency
) => {
  const booking = await validateBookingForPayment(bookingId, userId);
  const user = await UserModel.findById(userId).select("email name");

  const payCurrency = (currency || booking.currency || "EGP").toLowerCase();
  const amount = Math.round(booking.totalPrice * 100);

  const hotel = booking.hotel;
  const trip = booking.trip;
  const hotelName = hotel?.name?.en || hotel?.name || "Hotel booking";
  const hotelImages = toStripeImages(hotel?.coverImage, ...(hotel?.images || []));

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
            description: buildBookingCheckoutDescription(booking),
            ...(hotelImages.length ? { images: hotelImages } : {}),
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/booking/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
    cancel_url: `${process.env.FRONTEND_URL}/booking/payment/cancel?booking_id=${booking._id}`,
    custom_text: {
      submit: {
        message: trip
          ? `Confirm payment for ${hotelName} + trip "${trip.title}"`
          : `Confirm payment for your stay at ${hotelName}`,
      },
    },
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
      description: `Rahal booking — ${hotelName}${trip ? ` + ${trip.title}` : ""}`.slice(
        0,
        200
      ),
    },
  });

  booking.paymentStatus = "processing";
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
    case "checkout.session.completed":
      await fulfillBookingFromCheckout(event.data.object);
      break;
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
    bookingStatus: booking.status,
  };
};
// Revenue====================
export const getRevenueStats = async () => {
  const bookings = await BookingModel.find();

  let totalBookingRevenue = 0;

  bookings.forEach((booking) => {
    totalBookingRevenue += booking.totalPrice || 0;
  });

  const proSubscriptionsCount = await SubscriptionModel.countDocuments({
    planName: "pro",
  });

  const proSubscriptionsRevenue = proSubscriptionsCount * 20;

  return {
    totalBookingRevenue,
    proSubscriptionsRevenue,
    totalRevenue:
      totalBookingRevenue + proSubscriptionsRevenue,
  };
};
// =====================Average Booking Price======
export const getAverageBookingPrice = async () => {
  const bookings = await BookingModel.find();

  if (!bookings.length) {
    return {
      averageBookingPrice: 0,
    };
  }

  let total = 0;

  bookings.forEach((booking) => {
    total += booking.totalPrice || 0;
  });

  return {
    averageBookingPrice: total / bookings.length,
  };
};
// =====================Cancelled Bookings=====
export const getCancelledBookingsCount = async () => {
  const cancelledBookings = await BookingModel.countDocuments({
    status: "canceled",
  });

  return {
    cancelledBookings,
  };
};