// name, email, photo, pw, pw confirm
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User must enter a name.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'User must enter a valid email address.'],
    trim: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email.'],
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'User must enter a password.'],
    trim: true,
    minlength: [8, 'Password must have at least 8 characters'],
    // hide encrypted pw. otherwise it will be visible when the user is queried.
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'User must confirm password.'],
    trim: true,
    minlength: [8, 'Password must have at least 8 characters'],
    // only works on .save() & .create(). use .save() to update/patch a user so you can confirm the pw.
    validate: {
      validator: function (pwConfirm) {
        return pwConfirm === this.password;
      },
      message: 'Passwords must match.',
    },
  },
  passwordChangedAt: Date,
  // he calls it passwordResetToken
  hashedResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // no need to run this middleware if the pw wasn't modified
  if (!this.isModified('password')) return next();

  // salt & hash pw at cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // no longer need confirmation. tried using null but it showed in the DB.
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // sometimes saving to the DB is a little slower than issuing the jwt. since passwordChangedAt's time needs to be prior to the token's iat, (tokens are invalid if the password is changed AFTER the token is issued) we use this hack of subtracting 1 second from the passwordChangedAt's time.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// filtering out users who's active field is not set to true
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// instance method: available on all docs in collection. we have to pass the candidate pw into the function because this.password is not available due to it's select field being set to false in the schema
userSchema.methods.correctPassword = async function (candidatePw, userPw) {
  return await bcrypt.compare(candidatePw, userPw);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // if they changed their pw, check to make sure the token was issued AFTER they changed it. if the token was issued before they changed the pw, we want to throw an error.
  if (this.passwordChangedAt) {
    // convert date of pw change to time so we can compare to jwt timestamp
    const changedPwTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // return true if the pw was changed after the token time stamp
    return changedPwTimestamp > JWTTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // token to send to user's email for resetting pw
  const resetToken = crypto.randomBytes(32).toString('hex');

  // we need to hash the token in the DB so that a hacker gaining access to the token couldn't reset the pw
  // he calls it passwordResetToken
  this.hashedResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // add 10 minutes to the current time. have to use milliseconds.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
