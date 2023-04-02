const { findByIdAndUpdate } = require('../models/userModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsyncError = require('../utils/catchAsyncError');
const handlerFactory = require('../controllers/handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const filteredObj = {};
  const keys = Object.keys(obj);

  keys.forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredObj[key] = obj[key];
    }
  });

  return filteredObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsyncError(async (req, res, next) => {
  // create error if user's POST req containers pw data in an attempt to update (we update pws in authController)
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'You cannot change your password with this route. Please use /updatePassword for that.',
        400
      )
    );
  }

  // filter unwanted fields
  const filteredBody = filterObj(req.body, 'name', 'email');
  console.log(filteredBody);

  // update user with filtered body
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsyncError(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    // using JSEND formatting to envelop our data
    status: 'error',
    message: 'route not defined. use sign up instead.',
  });
};

exports.getUser = handlerFactory.getOne(User);
exports.getAllUsers = handlerFactory.getAll(User);
// do not update passwords with this
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
