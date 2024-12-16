const axios = require("axios");
const CustomError = require("../utils/customError.js");
const Product = require("../modals/webFLowProductsModel.js");

/**
 * Fetch and save products for a site from Webflow
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved product documents
 */
const fetchAndSaveProducts = async (userId, siteId, accessToken) => {
  try {
    // Validate input
    if (!accessToken) {
      throw new CustomError("Webflow access token is required", 400);
    }

    // Webflow API endpoint for fetching products
    const fetchProductsUrl = `https://api.webflow.com/v2/sites/${siteId}/products`;

    // Fetch products from Webflow
    const response = await axios.get(fetchProductsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    const { items: products } = response.data || {};

    if (!products || !products.length) {
      return { success: true, message: "No products found for the site" };
    }

    // Save products to the database
    const savedProducts = await saveProducts(userId, siteId, products);

    return {
      success: true,
      message: "Products fetched and saved successfully",
      data: savedProducts,
    };
  } catch (error) {
    console.error("Error in fetchAndSaveProducts:", error.message);
    throw new CustomError(
      error.response?.data?.message || "Failed to fetch products for the site",
      error.response?.status || 500
    );
  }
};

/**
 * Save fetched products to the database
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {Array} products - Array of products fetched from Webflow API
 * @returns {Promise<Array>} - List of saved product documents
 */
const saveProducts = async (userId, siteId, products) => {
  try {
    // Ensure the products array is valid
    if (!products || !Array.isArray(products)) {
      throw new CustomError("Invalid products data", 400);
    }

    // Prepare product documents
    const productDocuments = products.map((product) => ({
      productId: product.product.id,
      cmsLocaleId: product.product.cmsLocaleId || null,
      lastPublished: product.product.lastPublished || null,
      lastUpdated: product.product.lastUpdated || null,
      createdOn: product.product.createdOn || null,
      isArchived: product.product.isArchived || false,
      isDraft: product.product.isDraft || false,
      fieldData: {
        name: product.product.fieldData.name,
        slug: product.product.fieldData.slug,
        description: product.product.fieldData.description || null,
        shippable: product.product.fieldData.shippable || false,
        "sku-properties": (product.product.fieldData["sku-properties"] || []).map((skuProperty) => ({
          id: skuProperty.id,
          name: skuProperty.name,
          enum: skuProperty.enum.map((enumValue) => ({
            id: enumValue.id,
            name: enumValue.name,
            slug: enumValue.slug,
          })),
        })),
        "tax-category": product.product.fieldData["tax-category"] || null,
        "default-sku": product.product.fieldData["default-sku"] || null,
        "ec-product-type": product.product.fieldData["ec-product-type"] || null,
      },
      skus: (product.skus || []).map((sku) => ({
        skuId: sku.id,
        cmsLocaleId: sku.cmsLocaleId || null,
        lastPublished: sku.lastPublished || null,
        lastUpdated: sku.lastUpdated || null,
        createdOn: sku.createdOn || null,
        fieldData: {
          name: sku.fieldData.name,
          slug: sku.fieldData.slug,
          price: {
            value: sku.fieldData.price?.value || 0,
            unit: sku.fieldData.price?.unit || "USD",
          },
          "sku-values": sku.fieldData["sku-values"] || {},
          quantity: sku.fieldData.quantity || 0,
        },
      })),
    }));

    // Save or update each product in the database
    const savePromises = productDocuments.map(async (productDoc) => {
      return await Product.findOneAndUpdate(
        { productId: productDoc.productId, siteId }, // Filter criteria
        { $set: productDoc }, // Use `$set` to avoid overwriting fields unnecessarily
        { upsert: true, new: true, setDefaultsOnInsert: true } // Options
      );
    });

    // Wait for all products to be saved
    const savedProducts = await Promise.all(savePromises);

    return savedProducts;
  } catch (error) {
    console.error("Error in saveProducts:", error.message);
    throw new CustomError("Failed to save products", 500);
  }
};

module.exports = { fetchAndSaveProducts };
