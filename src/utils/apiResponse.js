export const successResponse = (res, { statusCode = 200, message, data, meta, length } = {}) => {
  const body = { status: "success" };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta) Object.assign(body, meta);
  if (length) body.length = length;
  return res.status(statusCode).json(body);
};

export const createdResponse = (res, { message, data, meta, length } = {}) =>
  successResponse(res, { statusCode: 201, message, data, meta, length });
