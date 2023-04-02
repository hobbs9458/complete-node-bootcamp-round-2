const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// GLOBAL MIDDLEWARE
// set security http headers
app.use(helmet());

// logs request obj data
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP. Please try again in an hour!',
});

app.use('/api', limiter);

// allow req.body and set body size limit.
app.use(express.json({ limit: '10kb' }));

// data sanitization against NoSQL query injection. removes mongo DB operators.
app.use(mongoSanitize());

// data sanitization against xss. cleans user input from malicious html code
app.use(xss());

// prevent parameter pollution e.g. having two sort parameters will be recieved as an array and so will interfere with our split method. ???hpp should be used near end of our security related global middlewares as it clears up our query string??? we can pass in white list which is an array of properties that we allow for duplicates of in the query string e.g. duration=5&duration=9. without the white list it only appears to respond to the last duration in the string.
app.use(
  hpp([
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price',
  ])
);

// serve static files
app.use(express.static(`${__dirname}/public`));

// MOUNT ROUTERS
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// catch uncaught routes
app.all('*', (req, res, next) => {
  // passing arg to next notifies express of an error and it jumps straight to global handler
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// global error handling middleware. 4 args indicate error handler and will only be called when there's an error.
app.use(globalErrorHandler);

module.exports = app;
