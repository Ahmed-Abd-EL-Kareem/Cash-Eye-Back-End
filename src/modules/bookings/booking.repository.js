
import BookingModel from "./booking.model.js";

export const createBooking = async (data) => {
  const booking = await BookingModel.create(data);
  return booking;
};

export const findBookingById = async (id) => {
  const booking = await BookingModel.findById(id)
    .populate("hotel", "name location averagePricePerNight")
    .populate("trip", "destination budget days travelers")
    .populate("user", "name email");

  return booking;
};

export const findAllBookings = async (filter = {}) => {
  const bookings = await BookingModel.find(filter)
    .populate("hotel", "name location averagePricePerNight")
    .populate("trip", "destination budget days travelers")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  return bookings;
};

export const findBookingsByUser = async (user) => {
  const bookings = await BookingModel.find({ user })
    .populate("hotel", "name location averagePricePerNight")
    .populate("trip", "destination budget days travelers")
    .sort({ createdAt: -1 });

  return bookings;
};

export const updateBookingById = async (id, data) => {
  const booking = await BookingModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate("hotel", "name location averagePricePerNight")
    .populate("trip", "destination budget days travelers")
    .populate("user", "name email");

  return booking;
};

export const deleteBookingById = async (id) => {
  const booking = await BookingModel.findByIdAndDelete(id);
  return booking;
};

export const findBookingByIdAndUser = async (id, user) => {
  const booking = await BookingModel.findOne({
    _id: id,
    user,
  })
    .populate("hotel", "name location averagePricePerNight")
    .populate("trip", "destination budget days travelers");

  return booking;
};