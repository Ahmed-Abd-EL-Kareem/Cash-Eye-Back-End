<<<<<<< HEAD
export const catchAsync = (fn) => {
=======
export default  (fn) => {
>>>>>>> main
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};