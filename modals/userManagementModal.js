const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { type } = require("os");
const CustomError = require("../utils/customError");

const UserSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  userRole: {
    type: String,
    enum: ["admin", "user"], // Allowed values
    default: "user", // Default value
  },
  isEmailVerified: {
    type: Boolean,
    default: false, // Initially set to false
  },

  webflowAccessToken: { type: String },
  connectedSites: [
    {
      type: mongoose.Schema.Types.ObjectId, // Reference to the "Sites" collection
      ref: "Site", // Name of the model to reference
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  //email verification
  emailVerificationCode: String, // Stores the verification code
  emailVerificationExpire: Date, // Expiration time for the token
  //reset password
  resetPasswordToken: String, // Token to be used for password reset
  resetPasswordExpire: Date, // Expiration time for the token

  isActive: { type: Boolean, default: false },
});

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

//**START** verify that the siteId going to save in connectedSites field is valid(exist in sites collection)

UserSchema.pre("save", async function (next) {
  try {
    if (this.isModified("connectedSites")) {
      // Get the current connectedSites
      const currentSites = this.connectedSites;

      // Check if the document is new
      if (this.isNew) {
        // For new documents, validate all IDs in connectedSites
        for (const siteId of currentSites) {
          const siteExists = await mongoose.model("Site").findById(siteId);
          if (!siteExists) {
            // Use structured error for the error handler
            next(new CustomError(`Site with ID ${siteId} does not exist.`,400))
          }
        }
      } else {
        // For existing documents, validate only newly added IDs
        const originalDoc = await this.constructor.findById(this._id);
        const originalSites = originalDoc.connectedSites;

        // Find the new site IDs
        const newSiteIds = currentSites.filter(
          (siteId) => !originalSites.includes(siteId)
        );

        for (const siteId of newSiteIds) {
          const siteExists = await mongoose.model("Site").findById(siteId);
          if (!siteExists) {
            next(new CustomError(`Site with ID ${siteId} does not exist.`,400))
          }
        }
      }
    }

    next(); // No error, proceed
  } catch (err) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));

  }
});
//**END** verify that the siteId going to save in connectedSites field is valid(exist in sites collection)




UserSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, name: this.userName, role: this.userRole },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_LIFETIME,
    }
  );
};

UserSchema.methods.comparePassword = async function (canditatePassword) {
  const isMatch = await bcrypt.compare(canditatePassword, this.password);
  return isMatch;
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire time (e.g., 10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

UserSchema.methods.generateEmailVerificationCode = function () {
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString(); // Generate a 6-digit code
  this.emailVerificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex"); // Hash the code
  this.emailVerificationExpire = Date.now() + 2 * 60 * 1000; // Code valid for 10 minutes
  return verificationCode; // Return unhashed code for sending via email
};

module.exports = mongoose.model("User", UserSchema);
