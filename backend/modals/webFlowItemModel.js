const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const ItemSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    itemId: {
      type: String,
      required: true,
      unique: true,
    },
    fieldData: {
      type: Object,
      required: true,
    },
    cmsLocaleId: {
      type: String,
    },
    lastPublished: {
      type: Date,
    },
    lastUpdated: {
      type: Date,
    },
    createdOn: {
      type: Date,
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["staged", "live"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to validate referenced fields during save
ItemSchema.pre("save", async function (next) {
  try {
    const referencesToValidate = [
      { field: "collectionId", model: "Collection" },
      { field: "siteId", model: "Site" },
      { field: "userId", model: "User" },
    ];

    for (const ref of referencesToValidate) {
      if (this.isModified(ref.field)) {
        const referenceExists = await mongoose.model(ref.model).findById(this[ref.field]);
        if (!referenceExists) {
          return next(new CustomError(`${ref.model} with ID ${this[ref.field]} does not exist.`, 400));
        }
      }
    }

    next();
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
});

// Middleware to validate referenced fields during findOneAndUpdate
ItemSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate(); // Get the update payload
    const referencesToValidate = [
      { field: "collectionId", model: "Collection" },
      { field: "siteId", model: "Site" },
      { field: "userId", model: "User" },
    ];

    for (const ref of referencesToValidate) {
      if (update[ref.field]) {
        const referenceExists = await mongoose.model(ref.model).findById(update[ref.field]);
        if (!referenceExists) {
          return next(new CustomError(`${ref.model} with ID ${update[ref.field]} does not exist.`, 400));
        }
      }
    }

    next();
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
});

module.exports = mongoose.model("Item", ItemSchema);
