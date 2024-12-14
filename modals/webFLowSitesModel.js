const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const SiteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the User who owns the site
      ref: "User",
      required: true,
    },
    webflowSiteId: {
      type: String, // ID provided by Webflow for this site
      required: true,
      unique: true,
    },
    displayName: {
      type: String, // Display name of the site
      required: true,
    },
    shortName: {
      type: String, // Short name of the site
      required: true,
    },
    previewUrl: {
      type: String, // URL of the site preview image
    },
    timeZone: {
      type: String, // Time zone of the site
    },
    createdOn: {
      type: Date, // Creation date of the site
    },
    lastUpdated: {
      type: Date, // Last updated date of the site
    },
    lastPublished: {
      type: Date, // Last published date of the site
    },
    parentFolderId: {
      type: String, // Parent folder ID (if any)
      default: null,
    },
    customDomains: {
      type: [String], // List of custom domains
      default: [],
    },
    locales: {
      primary: {
        id: { type: String }, // Locale ID
        cmsLocaleId: { type: String },
        enabled: { type: Boolean, default: false },
        displayName: { type: String },
        displayImageId: { type: String },
        redirect: { type: Boolean, default: false },
        subdirectory: { type: String },
        tag: { type: String },
      },
      secondary: [
        {
          id: { type: String },
          cmsLocaleId: { type: String },
          enabled: { type: Boolean },
          displayName: { type: String },
          displayImageId: { type: String },
          redirect: { type: Boolean },
          subdirectory: { type: String },
          tag: { type: String },
        },
      ],
    },
    dataCollectionEnabled: {
      type: Boolean, // Whether data collection is enabled
      default: false,
    },
    dataCollectionType: {
      type: String, // Type of data collection
      enum: ["always", "onPublish", "never"],
      default: "always",
    },
    collections: [
      {
        type: mongoose.Schema.Types.ObjectId, // Reference to the "Collections" collection
        ref: "Collection",
      },
    ],
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Middleware to validate that the collection IDs exist before saving
SiteSchema.pre("save", async function (next) {
  try {
    if (this.isModified("collections")) {
      const currentCollections = this.collections;

      // Validate each collection ID in the collections array
      for (const collectionId of currentCollections) {
        const collectionExists = await mongoose.model("Collection").findById(collectionId);
        if (!collectionExists) {
          next(new CustomError(`Collection with ID ${collectionId} does not exist.`, 400));
        }
      }
    }
    next(); // Proceed if all collections are valid
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
});

module.exports = mongoose.model("Site", SiteSchema);
