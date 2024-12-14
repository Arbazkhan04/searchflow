const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const CollectionSchema = new mongoose.Schema(
  {
    webflowCollectionId: {
      type: String, // ID provided by Webflow for this collection
      required: true,
      unique: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the Site model
      ref: "Site",
      required: true,
    },
    name: {
      type: String, // Name of the collection (e.g., Blog Posts)
      required: true,
    },
    slug: {
      type: String, // Webflow slug for the collection
      required: true,
    },
    fields: [
      {
        fieldName: { type: String, required: true }, // Field name (e.g., title, content)
        fieldType: { type: String, required: true }, // Field type (e.g., string, rich-text)
      },
    ],
    items: [
      {
        type: mongoose.Schema.Types.ObjectId, // References to Item model
        ref: "Item",
      },
    ],
  },
  {
    timestamps: true, // Automatically manage `createdAt` and `updatedAt`
  }
);

// Middleware to validate the siteId exists
CollectionSchema.pre("save", async function (next) {
  try {
    const siteExists = await mongoose.model("Site").findById(this.siteId);
    if (!siteExists) {
      next(new CustomError(`Site with ID ${this.siteId} does not exist.`, 400));
    }
    next(); // No errors, proceed
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
});

module.exports = mongoose.model("Collection", CollectionSchema);
