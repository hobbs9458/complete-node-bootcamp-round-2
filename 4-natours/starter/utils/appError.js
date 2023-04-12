class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Creates a .stack property on targetObject ('this' in this case), which when accessed returns a string representing the location in the code at which Error.captureStackTrace() was called.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
