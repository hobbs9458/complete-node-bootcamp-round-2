const Review = require('../models/reviewModel');
const APIFeatures = require('../utils/apiFeatures');
// const catchAsyncError = require('../utils/catchAsyncError');
const handlerFactory = require('../controllers/handlerFactory');

exports.getAllReviews = handlerFactory.getAll(Review);

exports.setTourAndUserIds = (req, res, next) => {
  // allow nested routes when tour and user are not specified in request body
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getReview = handlerFactory.getOne(Review);
exports.createReview = handlerFactory.createOne(Review);
exports.updateReview = handlerFactory.updateOne(Review);
exports.deleteReview = handlerFactory.deleteOne(Review);
