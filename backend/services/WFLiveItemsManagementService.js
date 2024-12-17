// const axios = require("axios");
// const CustomError = require("../utils/customError.js");
// const Item = require("../modals/webFlowItemModel.js");

// /**
//  * Fetch and save items for a collection from Webflow
//  * @param {string} userId - The ID of the user
//  * @param {string} collectionId - The ID of the collection
//  * @param {string} accessToken - Webflow access token for the user
//  * @returns {Promise<Object>} - Success message and saved item documents
//  */
// const fetchAndSaveItems = async (userId, collectionId, accessToken) => {
//   try {
//     // Validate input
//     if (!accessToken) {
//       throw new CustomError("Webflow access token is required", 400);
//     }

//     // Webflow API endpoint for fetching items
//     const fetchItemsUrl = `https://api.webflow.com/v2/collections/${collectionId}/items`;

//     // Fetch items from Webflow
//     const response = await axios.get(fetchItemsUrl, {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "accept-version": "2.0.0",
//       },
//     });

//     const { items } = response.data || {};

//     if (!items || !items.length) {
//       return { success: true, message: "No items found for the collection" };
//     }

//     // Save items to the database
//     const savedItems = await saveItems(userId, collectionId, items);

//     return {
//       success: true,
//       message: "Items fetched and saved successfully",
//       data: savedItems,
//     };
//   } catch (error) {
//     console.error("Error in fetchAndSaveItems:", error.message);
//     throw new CustomError(
//       error.response?.data?.message || "Failed to fetch items for the collection",
//       error.response?.status || 500
//     );
//   }
// };

// /**
//  * Save fetched items to the database
//  * @param {string} userId - The ID of the user
//  * @param {string} collectionId - The ID of the collection
//  * @param {Array} items - Array of items fetched from Webflow API
//  * @returns {Promise<Array>} - List of saved item documents
//  */
// const saveItems = async (userId, collectionId, items) => {
//   try {
//     // Ensure the items array is valid
//     if (!items || !Array.isArray(items)) {
//       throw new CustomError("Invalid items data", 400);
//     }

//     // Prepare item documents
//     const itemDocuments = items.map((item) => ({
//       collectionId,
//       itemId: item.id,
//       fieldData: item.fieldData,
//       cmsLocaleId: item.cmsLocaleId || null,
//       lastPublished: item.lastPublished || null,
//       lastUpdated: item.lastUpdated || null,
//       createdOn: item.createdOn,
//       isArchived: item.isArchived || false,
//       isDraft: item.isDraft || false,
//       status: item.isDraft ? "staged" : "live",
//       userId,
//       siteId: item.siteId, // Assuming siteId is provided in the item data
//     }));

//     // Save or update each item in the database
//     const savePromises = itemDocuments.map(async (itemDoc) => {
//       return await Item.findOneAndUpdate(
//         { itemId: itemDoc.itemId, collectionId }, // Filter criteria
//         { $set: itemDoc }, // Use `$set` to avoid overwriting fields unnecessarily
//         { upsert: true, new: true, setDefaultsOnInsert: true } // Options
//       );
//     });

//     // Wait for all items to be saved
//     const savedItems = await Promise.all(savePromises);

//     return savedItems;
//   } catch (error) {
//     console.error("Error in saveItems:", error.message);
//     throw new CustomError("Failed to save items", 500);
//   }
// };

// module.exports = { fetchAndSaveItems };
















const axios = require("axios");

const CustomError = require("../utils/customError.js");
const Item = require("../modals/webFlowItemModel.js");
const Collection = require("../modals/webFlowCollectionModel.js");

/**
 * Fetch and save all items for a site from Webflow by fetching collections from the database
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved item documents
 */
const fetchAndSaveSiteItems = async (userId, siteId, accessToken) => {
  try {
    if (!accessToken) {
      throw new CustomError("Webflow access token is required", 400);
    }

    // Step 1: Fetch all collections for the site from MongoDB
    const collections = await Collection.find({ webflowsiteId: siteId });

    console.log("collections in wfliveitemsservice",collections)
    if (!collections || collections.length === 0) {
      return { success: true, message: "No collections found for this site" };
    }

    console.log(`Found ${collections.length} collections for site ${siteId}`);

    // Step 2: Fetch and save items for each collection
    const saveItemTasks = collections.map((collection) =>
      fetchAndSaveCollectionItems(userId, siteId, collection.webflowCollectionId, accessToken)
    );

    // Execute all fetch and save operations concurrently
    const results = await Promise.all(saveItemTasks);

    return {
      success: true,
      message: "All collection items fetched and saved successfully",
      data: results,
    };
  } catch (error) {
    console.error("Error in fetchAndSaveSiteItems:", error.message);
    throw new CustomError(
      error.message || "Failed to fetch and save site items",
      500
    );
  }
};

/**
 * Fetch and save items for a specific collection
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {string} collectionId - The ID of the collection
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved item documents
 */
const fetchAndSaveCollectionItems = async (userId, siteId, collectionId, accessToken) => {
  try {
    const fetchItemsUrl = `https://api.webflow.com/v2/collections/${collectionId}/items`;

    // Fetch items from Webflow API
    const response = await axios.get(fetchItemsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    const { items } = response.data || {};

    if (!items || items.length === 0) {
      console.log(`No items found for collection ${collectionId}`);
      return { collectionId, message: "No items found" };
    }

    console.log(`Fetched ${items.length} items for collection ${collectionId}`);

    // Save items to the database
    const savedItems = await saveItems(userId, siteId, collectionId, items);

    return {
      collectionId,
      totalItems: savedItems.length,
      message: "Items fetched and saved successfully",
    };
  } catch (error) {
    console.error(`Error in fetchAndSaveCollectionItems for collection ${collectionId}:`, error.message);
    throw new CustomError(
      error.response?.data?.message || `Failed to fetch items for collection ${collectionId}`,
      error.response?.status || 500
    );
  }
};

/**
 * Save fetched items to the database
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {string} collectionId - The ID of the collection
 * @param {Array} items - Array of items fetched from Webflow API
 * @returns {Promise<Array>} - List of saved item documents
 */
const saveItems = async (userId, siteId, collectionId, items) => {
  try {
    const itemDocuments = items.map((item) => ({
      collectionId,
      itemId: item.id,
      fieldData: item.fieldData,
      cmsLocaleId: item.cmsLocaleId || null,
      lastPublished: item.lastPublished || null,
      lastUpdated: item.lastUpdated || null,
      createdOn: item.createdOn,
      isArchived: item.isArchived || false,
      isDraft: item.isDraft || false,
      status: item.isDraft ? "staged" : "live",
      userId,
      siteId,
    }));

    const savePromises = itemDocuments.map(async (itemDoc) => {
      return await Item.findOneAndUpdate(
        { itemId: itemDoc.itemId, collectionId },
        { $set: itemDoc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    const savedItems = await Promise.all(savePromises);

    return savedItems;
  } catch (error) {
    console.error("Error in saveItems:", error.message);
    throw new CustomError("Failed to save items", 500);
  }
};


/**
 * Count documents in the Collection model based on filter parameters
 * @param {Object} filter - Filter object to match documents (e.g., { userId, webflowsiteId })
 * @returns {Promise<number>} - Returns the count of matching documents
 */
const countItemDocuments = async (filter) => {
  try {
    if (!filter || typeof filter !== "object") {
      throw new CustomError("Filter must be a valid object", 400);
    }

    const count = await Item.countDocuments(filter);
    return count;
  } catch (error) {
    console.error("Error in countCollectionDocuments Service:", error.message);
    throw new CustomError(
      error.message || "Failed to count documents in collection",
      500
    );
  }
};






module.exports = { fetchAndSaveSiteItems,countItemDocuments };

