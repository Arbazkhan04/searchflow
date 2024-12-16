const axios = require("axios");
const CustomError = require("../utils/customError.js");
const Item = require("../modals/webFlowItemModel.js");

/**
 * Fetch and save items for a collection from Webflow
 * @param {string} userId - The ID of the user
 * @param {string} collectionId - The ID of the collection
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved item documents
 */
const fetchAndSaveItems = async (userId, collectionId, accessToken) => {
  try {
    // Validate input
    if (!accessToken) {
      throw new CustomError("Webflow access token is required", 400);
    }

    // Webflow API endpoint for fetching items
    const fetchItemsUrl = `https://api.webflow.com/v2/collections/${collectionId}/items`;

    // Fetch items from Webflow
    const response = await axios.get(fetchItemsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    const { items } = response.data || {};

    if (!items || !items.length) {
      return { success: true, message: "No items found for the collection" };
    }

    // Save items to the database
    const savedItems = await saveItems(userId, collectionId, items);

    return {
      success: true,
      message: "Items fetched and saved successfully",
      data: savedItems,
    };
  } catch (error) {
    console.error("Error in fetchAndSaveItems:", error.message);
    throw new CustomError(
      error.response?.data?.message || "Failed to fetch items for the collection",
      error.response?.status || 500
    );
  }
};

/**
 * Save fetched items to the database
 * @param {string} userId - The ID of the user
 * @param {string} collectionId - The ID of the collection
 * @param {Array} items - Array of items fetched from Webflow API
 * @returns {Promise<Array>} - List of saved item documents
 */
const saveItems = async (userId, collectionId, items) => {
  try {
    // Ensure the items array is valid
    if (!items || !Array.isArray(items)) {
      throw new CustomError("Invalid items data", 400);
    }

    // Prepare item documents
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
      siteId: item.siteId, // Assuming siteId is provided in the item data
    }));

    // Save or update each item in the database
    const savePromises = itemDocuments.map(async (itemDoc) => {
      return await Item.findOneAndUpdate(
        { itemId: itemDoc.itemId, collectionId }, // Filter criteria
        { $set: itemDoc }, // Use `$set` to avoid overwriting fields unnecessarily
        { upsert: true, new: true, setDefaultsOnInsert: true } // Options
      );
    });

    // Wait for all items to be saved
    const savedItems = await Promise.all(savePromises);

    return savedItems;
  } catch (error) {
    console.error("Error in saveItems:", error.message);
    throw new CustomError("Failed to save items", 500);
  }
};

module.exports = { fetchAndSaveItems };
