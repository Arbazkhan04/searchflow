const mongoose = require("mongoose");
const CustomError = require("../utils/customError");

const SkuPropertyEnumSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Enum value ID (e.g., specific size or color ID)
  name: { type: String, required: true }, // Enum value name (e.g., "Small" or "Blue")
  slug: { type: String, required: true }, // Enum value slug (e.g., "small" or "blue")
});

const SkuPropertySchema = new mongoose.Schema({
  id: { type: String, required: true }, // Property ID (e.g., size or color group ID)
  name: { type: String, required: true }, // Name of the property (e.g., "Size" or "Color")
  enum: [SkuPropertyEnumSchema], // Array of enums for this property
});

const SkuSchema = new mongoose.Schema({
  skuId: {
    type: String, // Unique SKU ID
    required: true,
  },
  cmsLocaleId: {
    type: String, // Locale ID for the SKU
  },
  lastPublished: {
    type: Date, // Last published date for the SKU
  },
  lastUpdated: {
    type: Date, // Last updated date for the SKU
  },
  createdOn: {
    type: Date, // Creation date for the SKU
    required: true,
  },
  fieldData: {
    name: { type: String, required: true }, // Name of the SKU
    slug: { type: String, required: true }, // Slug for the SKU
    price: {
      value: { type: Number }, // Price value
      unit: { type: String }, // Price currency (e.g., USD)
    },
    "sku-values": { type: Map, of: String }, // SKU-specific values (e.g., size, color IDs)
    quantity: { type: Number, default: 0 }, // Quantity available for the SKU
  },
});

const ProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String, // Unique Webflow product ID
      required: true,
      unique: true,
    },
    cmsLocaleId: {
      type: String, // Locale ID for the product
    },
    lastPublished: {
      type: Date, // Last published date for the product
    },
    lastUpdated: {
      type: Date, // Last updated date for the product
    },
    createdOn: {
      type: Date, // Creation date for the product
      required: true,
    },
    isArchived: {
      type: Boolean, // Whether the product is archived
      default: false,
    },
    isDraft: {
      type: Boolean, // Whether the product is a draft
      default: false,
    },
    fieldData: {
      name: { type: String, required: true }, // Name of the product
      slug: { type: String, required: true }, // Slug for the product
      description: { type: String }, // Description of the product
      shippable: { type: Boolean, default: false }, // Whether the product is shippable
      "sku-properties": [SkuPropertySchema], // Array of SKU properties with nested enums
      "tax-category": { type: String }, // Tax category of the product
      "default-sku": { type: String }, // ID of the default SKU
      "ec-product-type": { type: String }, // Webflow e-commerce product type ID
    },
    skus: [SkuSchema], // Embedded SKUs
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Middleware to validate SKU properties (if required)
ProductSchema.pre("save", async function (next) {
  try {
    // Ensure SKUs are unique within the product
    const skuIds = this.skus.map((sku) => sku.skuId);
    const uniqueSkuIds = new Set(skuIds);
    if (skuIds.length !== uniqueSkuIds.size) {
      return next(new CustomError("Duplicate SKU IDs found within the product.", 400));
    }

    next();
  } catch (error) {
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
});

module.exports = mongoose.model("Product", ProductSchema);
