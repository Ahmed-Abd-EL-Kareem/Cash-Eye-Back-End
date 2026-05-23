export const successResponse = (res, { statusCode = 200, message, data, meta } = {}) => {
  const body = { status: "success" };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta) Object.assign(body, meta);
  return res.status(statusCode).json(body);
};

export const createdResponse = (res, { message, data, meta } = {}) =>
  successResponse(res, { statusCode: 201, message, data, meta });
