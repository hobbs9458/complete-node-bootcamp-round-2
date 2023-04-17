const { findByIdAndUpdate } = require('../models/userModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsyncError = require('../utils/catchAsyncError');
const handlerFactory = require('../controllers/handlerFactory');
const multer = require('multer');
// sharp is an image processing library
const sharp = require('sharp');

// we were saving our uploaded images in the public dir
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const fileExtension = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${fileExtension}`);
//   },
// });

// saving uploaded image as a buffer in memory: "buffer" refers to a temporary storage area in the computer's memory where data can be held before it is processed
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsyncError(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

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

  if (req.file) {
    filteredBody.photo = req.file.filename;
  }

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
