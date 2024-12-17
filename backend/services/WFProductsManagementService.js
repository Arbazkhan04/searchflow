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
// const fetchAndSaveProducts = async (userId, siteId, accessToken) => {
//   try {
//     console.log("came in the service method")
//     // Validate input
//     if (!accessToken) {
//       throw new CustomError("Webflow access token is required", 400);
//     }

//     // Webflow API endpoint for fetching products
//     const fetchProductsUrl = `https://api.webflow.com/v2/sites/${siteId}/products`;

//     // Fetch products from Webflow
//     const response = await axios.get(fetchProductsUrl, {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "accept-version": "2.0.0",
//       },
//     });
//     console.log("response in product maangement service",response.data)


//     const { items: products } = response.data || {};

//     if (!products || !products.length) {
//       return { success: true, message: "No products found for the site" };
//     }

//     // Save products to the database
//     const savedProducts = await saveProducts(userId, siteId, products);

//     return {
//       success: true,
//       message: "Products fetched and saved successfully",
//       data: savedProducts,
//     };
//   } catch (error) {
//     console.error("Error in fetchAndSaveProducts:", error.message);
//     throw new CustomError(
//       error.response?.data?.message || "Failed to fetch products for the site",
//       error.response?.status || 500
//     );
//   }
// };




const fetchAndSaveProducts = async (userId, siteId, accessToken) => {
  try {
    // Check if Ecommerce is initialized
    const ecommerceEnabled = await isEcommerceEnabled(siteId, accessToken);

    if (!ecommerceEnabled) {
      return {
        success: true,
        message: "Ecommerce is not initialized for this site.",
        data: null
      };
    }

    // Proceed to fetch products
    const fetchProductsUrl = `https://api.webflow.com/v2/sites/${siteId}/products`;

    const response = await axios.get(fetchProductsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    const { items: products } = response.data || {};

    if (!products || !products.length) {
      return { success: true, message: "No products found for the site." };
    }

    // Save the fetched products to the database (existing logic)
    const savedProducts = await saveProducts(userId, siteId, products);

    return {
      success: true,
      message: "Products fetched and saved successfully.",
      data: savedProducts,
    };
  } catch (error) {
    throw new CustomError(
      error.response?.data?.message || "Failed to fetch products",
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



/**
 * Check if Ecommerce is initialized for a site
 * @param {string} siteId - The ID of the site
 * @param {string} accessToken - Webflow access token
 * @returns {boolean} - Returns true if Ecommerce is enabled, false otherwise
 */
const isEcommerceEnabled = async (siteId, accessToken) => {
  const productsEndpoint = `https://api.webflow.com/v2/sites/${siteId}/products`;

  try {
    const response = await axios.get(productsEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    return true; // If the request succeeds, Ecommerce is enabled
  } catch (error) {
    if (
      error.response &&
      error.response.status === 409 &&
      error.response.data.message.includes("Ecommerce is not yet initialized")
    ) {
      return false; // Ecommerce is not initialized
    }

    throw new CustomError(
      error.response?.data?.message || "Failed to check Ecommerce status",
      error.response?.status || 500
    );
  }
};



/**
 * Count documents in the Products model based on filter parameters
 * @param {Object} filter - Filter object to match documents (e.g., { userId, webflowsiteId })
 * @returns {Promise<number>} - Returns the count of matching documents
 */
const countProductDocuments = async (filter) => {
  try {
    if (!filter || typeof filter !== "object") {
      throw new CustomError("Filter must be a valid object", 400);
    }

    const count = await Product.countDocuments(filter);
    return count;
  } catch (error) {
    console.error("Error in countProductDocuments Service:", error.message);
    throw new CustomError(
      error.message || "Failed to count products in collection",
      500
    );
  }
};

module.exports = { fetchAndSaveProducts,countProductDocuments };
