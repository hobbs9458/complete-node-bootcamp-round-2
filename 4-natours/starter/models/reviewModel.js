const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review is required'],
    },

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },

    createdAt: {
      type: Date,
      default: Date.now(),
    },

    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// each combination of tour and user must be unique when they leave a review.
// prevents a user from leaving multiple reviews on one tour.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: '-guides name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// we use a static method because we need to call aggregate on the model, and in a static method the this keyword points to the current model
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  console.log(tourId);
  const stats = await this.aggregate([
    {
      // select all reviews that match the current tourId
      $match: { tour: tourId },
    },
    // calculate stats for these reviews
    {
      $group: {
        // _id: $tour is same as tourId
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    // save stats to current tour
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // defaults
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// we use post so when we do our calculation the review is available on the collection
reviewSchema.post('save', function () {
  // 'this' points to doc being saved (current review)
  // to use our static method we must use constructor (which points to the model that created the doc) to call static method on model because the Review variable isn't defined until below
  this.constructor.calcAverageRatings(this.tour);
});

// calculate stats on update e.g. findByIdAndUpdate & findByIdAndDelete (these are built on findOneAnd which is why we pass it into our regex)
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // 'this' is the current query but we need doc so we execute query using findOne
  // r stands for review. we save it on the 'this' variable so we have access to the updated review data in the post save middleware
  this.r = await this.findOne();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
