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

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B) RENDERED WEBSITE
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
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

    sendErrorProd(errCopy, req, res);
  }
};
