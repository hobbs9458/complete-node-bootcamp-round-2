const fs = require('fs');
const { findByIdAndUpdate } = require('../models/tourModel');
const Tour = require('../models/tourModel');

const catchAsyncError = require('../utils/catchAsyncError');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');

// HE PASSES IN NEXT TO ALL HIS ASYNC FUNCTIONS, BUT I DON'T KNOW IF IT'S NECESSARY BECAUSE WE PASS NEXT INTO OUR ANONYMOUS FUNCTION IN OUR catchAsyncError function. IF YOU HAVE ERROR ISSUES, TRY PASSING NEXT INTO ASYNC LIKE HE DOES TO CHECK IF IT'S A FACTOR.

// we're filling the query string for the user, so they only have to use a convenient alias to request the data
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// STANDARD CONTROLLERS
exports.getAllTours = handlerFactory.getAll(Tour);
exports.getTour = handlerFactory.getOne(Tour, {
  path: 'reviews',
});

exports.createTour = handlerFactory.createOne(Tour);
exports.updateTour = handlerFactory.updateOne(Tour);
exports.deleteTour = handlerFactory.deleteOne(Tour);

exports.getTourStats = catchAsyncError(async (req, res) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // 1 to count each tour as 1
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      // 1 for ascending
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    // using JSEND formatting to envelop our data
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsyncError(async (req, res) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },

    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },

    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { numTourStarts: -1 },
    },
  ]);

  res.status(200).json({
    // using JSEND formatting to envelop our data
    status: 'success',
    data: {
      plan,
    },
  });
});

// '/tours-within/:distance/center/:latlng/unit/:unit'
exports.getToursWithin = catchAsyncError(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  // mongoDB expects the radius of our sphere to be specified in radians. radians is found by dividing our distance by the radius of the earth. so must take into account whether our distance is in miles or kilometers
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(new AppError('Please enter lat and long in correct format: lat,lng'));
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsyncError(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(new AppError('Please enter lat and long in correct format: lat,lng'));
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      // project specifies what data we want to get back from our request
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
