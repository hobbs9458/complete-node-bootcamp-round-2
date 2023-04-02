const AppError = require('../utils/appError');

const handleValidationErrorDB = (err) => {
  const errorMsgs = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errorMsgs.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTError = () => {
  const message = `Invalid token. Please log in again.`;
  return new AppError(message, 401);
};

const handleJWTExpiredError = () => {
  const message = `Token expired. Please log in again.`;
  return new AppError(message, 401);
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/"((?:\\.|[^"\\])*)"/)[0];
  const message = `Duplicate field value: ${value}. Please use another value for this field.`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProduction = (err, res) => {
  // AppError error. show details.
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // unknown error. show generic message.
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // make mongoose errors operational with AppError so we can show understandable details to client.
    let errCopy = Object.assign(err);

    if (errCopy.name === 'CastError') {
      errCopy = handleCastErrorDB(errCopy);
    }

    if (errCopy.code === 11000) {
      errCopy = handleDuplicateFieldsDB(errCopy);
    }

    if (errCopy.name === 'ValidationError') {
      errCopy = handleValidationErrorDB(errCopy);
    }

    if (errCopy.name === 'JsonWebTokenError') {
      errCopy = handleJWTError();
    }

    if (errCopy.name === 'TokenExpiredError') {
      errCopy = handleJWTExpiredError();
    }

    sendErrorProduction(errCopy, res);
  }
};
