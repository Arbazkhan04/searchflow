const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const CollectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the User who owns the collection
      ref: "User",
      required: true,
    },
    webflowsiteId: {
      type: String, // Webflow's collection ID
      required: true,
    },
    webflowCollectionId: {
      type: String, // Webflow's collection ID
      required: true,
      unique: true,
    },
    displayName: {
      type: String, // Display name of the collection
      required: true,
    },
    singularName: {
      type: String, // Singular name of the collection
      required: true,
    },
    slug: {
      type: String, // Slug of the collection
      required: true,
    },
    createdOn: {
      type: Date, // Creation date of the collection
    },
    lastUpdated: {
      type: Date, // Last updated date of the collection
    },
    liveItems: [
      {
        type: String, // IDs of live items in the collection
      },
    ],
    stagedItems: [
      {
        type: String, // IDs of staged items in the collection
      },
    ],
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// // Middleware to validate that the `siteId` exists before saving
// CollectionSchema.pre("save", async function (next) {
//   try {
//     if (this.isModified("siteId")) {
//       const siteExists = await mongoose.model("Site").findById(this.siteId);
//       if (!siteExists) {
//         return next(new CustomError(`Site with ID ${this.siteId} does not exist.`, 400));
//       }
//     }
//     next();
//   } catch (error) {
//     next(error instanceof CustomError ? error : new CustomError(error.message, 500));
//   }
// });

module.exports = mongoose.model("Collection", CollectionSchema);
