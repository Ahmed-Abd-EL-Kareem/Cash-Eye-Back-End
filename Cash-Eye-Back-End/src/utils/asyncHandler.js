export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/** @deprecated Use asyncHandler — kept for gradual migration */
export const catchAsync = asyncHandler;

export default asyncHandler;
