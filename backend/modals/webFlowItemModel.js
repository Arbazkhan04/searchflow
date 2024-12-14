const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const ItemSchema = new mongoose.Schema(
  {
    webflowItemId: {
      type: String, // ID provided by Webflow for this item
      required: true,
      unique: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the Collection model
      ref: "Collection",
      required: true,
    },
    fields: {
      type: Map, // Use Map to store key-value pairs (e.g., title, content)
      of: String, // Each field value will be stored as a string
      required: true,
    },
  },
  {
    timestamps: true, // Automatically manage `createdAt` and `updatedAt`
  }
);

// Middleware to validate the collectionId exists
ItemSchema.pre("save", async function (next) {
  try {
    const collectionExists = await mongoose.model("Collection").findById(this.collectionId);
    if (!collectionExists) {
      next(new CustomError(`Collection with ID ${this.collectionId} does not exist.`, 400));
    }
    next(); // No errors, proceed
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
});

module.exports = mongoose.model("Item", ItemSchema);
