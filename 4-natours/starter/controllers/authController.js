const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsyncError = require('../utils/catchAsyncError');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const sendEmail = require('../utils/email');

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    // 24-hours, 60-minutes, 60-seconds, 1000-ms: passing 90 days in ms to date constructor
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsyncError(async (req, res, next) => {
  // below line has security issues because any user can sign up as an admin
  // const newUser = await User.create(req.body);

  // this method is more secure because we only allow the data we need to go in the newUser. so if they try to manually input a role like admin we will ignore it. if we need a new administrator, we can do it by creating a standard user then updating them to admin from compass
  const { name, email, password, passwordConfirm, passwordChangedAt, role } =
    req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    passwordChangedAt,
    role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsyncError(async (req, res, next) => {
  // check if email & pw exist
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide an email and a password'));
  }

  // check if user exists & pw is correct. need to use the + symbol in front of string to select password because by default it's select is set to false. fields with select=false will still be in the database, but inaccessible by query and not sent back in response. so we need to set select=true temporarily allows us to access it with a query.
  const user = await User.findOne({ email }).select('+password');

  // using the correctPassword instance method to verify correct pw, else throw error
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // hide pw
  user.password = undefined;

  // if ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  console.log('backend log out function');
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsyncError(async (req, res, next) => {
  // check if token exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Please login to access this route'));
  }

  // verify the token. automatically throws error if token is not verified and we handle it in global error handler
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // most tutorials stop here but they are not really secure. we still need to:

  // check if the user still exists. if they were deleted from the DB after the token was issued, they should not gain access
  const currentUser = await User.findById(decodedPayload.id);
  if (!currentUser) {
    return next(
      new AppError('The user with this token is no longer in the DB'),
      401
    );
  }

  // make sure pw wasn't changed. if a token was stolen, a user may change the pw to prevent others from accessing the route. if we don't verify the pw is correct, the user who stole the token could gain access.
  if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
    return next(
      new AppError(
        'Password changed recently. It was changed after the token was issued. Please log in again.',
        401
      )
    );
  }

  // add user to request body so we can use it in subsequent middleware
  req.user = currentUser;

  // grant access to protected route
  next();
});

// similar to protect function but only for rendered pages, so there will be no errors. ???he doesn't explain why???
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // verify the token.
      const decodedPayload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // check if the user still exists
      const currentUser = await User.findById(decodedPayload.id);

      if (!currentUser) {
        return next();
      }

      // make sure pw wasn't changed after token was issued.
      if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
        return next();
      }

      // if it makes it here, there is a logged in user

      // every pug template has access to res.locals so we can pass data (currentUser in this case) from our middleware into our templates.
      res.locals.user = currentUser;
    } catch (err) {
      console.log(err);
      return next();
    }
  }
  next();
};

exports.restrictTo = function (...roles) {
  // we wrap the middlewear function so we can pass the arg ...roles into it from the outer function. we gain access to it from the inner function due to closure
  return (req, res, next) => {
    // check to see if the user role is any of the strings in the roles arr. we have access to req.user.role because we attached it to the req in the .protect() middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  // get user from email on post req
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('No user found with that email', 404));
  }
  // generate random reset token (crypto, not jwt)
  const resetToken = user.createPasswordResetToken();
  // validateBeforeSave: false --> disables the validation of our schema so the user can just send a password
  await user.save({ validateBeforeSave: false });

  // send to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  console.log(resetURL);

  const message = `
  Forgot your password? Submit a request with your new password to the following url:
  
  ${resetURL}
  
  If you didn't forget or lose your password, disregard this email. It will self destruct in 10 minutes!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    (user.hashedResetToken = undefined),
      (user.passwordResetExpires = undefined);
    await user.save({ validateBeforeSave: false });
    console.log('error:', err);
    return next(
      new AppError(
        'There was an error sending the email. Please try again.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsyncError(async (req, res, next) => {
  // get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    hashedResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // set new pw if token has not expired & we find a user with the token
  if (!user) return next(new AppError('Token is invalid or expired'));

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  user.hashedResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  // update changedPasswordAt property for user: we do this in the userModel middleware

  // log the user in & send jwt to
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.updatePassword = catchAsyncError(async (req, res, next) => {
  // get user from collection
  const user = await User.findById(req.user._id).select('+password');

  // check if POSTed current password is correct
  const currentPwInDB = user.password;
  const candidatePw = req.body.currentPassword;

  const passwordIsCorrect = await user.correctPassword(
    candidatePw,
    currentPwInDB
  );

  if (!passwordIsCorrect) {
    return next(
      new AppError(
        'That is not the current password for this user. Please try again with the correct password.',
        401
      )
    );
  }

  // if so update the password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  // hide pw in user
  user.password = undefined;

  // log user in and send jwt
  createSendToken(user, 200, res);
});
