module.exports = (fn) => {
  // we return an anonymous function so that express can call it when the route is hit
  return (req, res, next) => {
    // passing next as callback will call next with the caught error as it's arg. express will jump to our global error handling middleware.
    fn(req, res, next).catch(next);
  };
};
