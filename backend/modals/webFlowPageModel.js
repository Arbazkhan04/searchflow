const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const PageSchema = new mongoose.Schema(
  {
    webFlowPageId: {
      type: String, // Webflow's Page ID
      required: true,
      unique: true,
    },
    webFlowSiteId: {
        type: String, // Webflow's Page ID
        required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the User
      ref: "User",
      required: true,
    },
    title: {
      type: String, // Title of the page
      required: true,
    },
    slug: {
      type: String, // Slug of the page
      required: true,
    },
    createdOn: {
      type: Date, // Creation date of the page
      required: true,
    },
    lastUpdated: {
      type: Date, // Last updated date of the page
    },
    archived: {
      type: Boolean, // Whether the page is archived
      default: false,
    },
    draft: {
      type: Boolean, // Whether the page is in draft mode
      default: false,
    },
    canBranch: {
      type: Boolean, // Whether the page can branch
      default: false,
    },
    isBranch: {
      type: Boolean, // Whether the page is a branch
      default: false,
    },
    isMembersOnly: {
      type: Boolean, // Whether the page is for members only
      default: false,
    },
    seo: {
      title: { type: String }, // SEO title
      description: { type: String }, // SEO description
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Middleware to validate referenced fields
PageSchema.pre("save", async function (next) {
  try {
    const referencesToValidate = [
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

module.exports = mongoose.model("Page", PageSchema);
