const axios = require("axios");
const CustomError = require("../utils/customError.js");
const Collection = require("../modals/webFlowCollectionModel.js");

/**
 * Fetch all collections for a site from Webflow and save them to the database
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved collection documents
 */
const fetchAndSaveUserCollections = async (userId, siteId, accessToken) => {
  try {
    // Validate input
    if (!accessToken) {
      throw new CustomError("Webflow access token is required", 400);
    }

    // Webflow API endpoint for fetching collections
    const fetchCollectionsUrl = `https://api.webflow.com/v2/sites/${siteId}/collections`;


    // Fetch collections from Webflow
    const response = await axios.get(fetchCollectionsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    const { collections } = response.data || {};

    if (!collections || !collections.length) {
      return { success: true, message: "No collections found for the site" };
    }

    // Save collections to the database
    const savedCollections = await saveWebflowCollections(userId, siteId, collections);

    return {
      success: true,
      message: "Collections fetched and saved successfully",
      data: savedCollections,
    };
  } catch (error) {
    console.error("Error in fetchAndSaveUserCollections:", error.message);
    throw new CustomError(
      error.response?.data?.message || "Failed to fetch collections for the site",
      error.response?.status || 500
    );
  }
};

/**
 * Save fetched collections to the database
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {Array} collections - Array of collections fetched from Webflow API
 * @returns {Promise<Array>} - List of saved collection documents
 */
const saveWebflowCollections = async (userId, siteId, collections) => {
  try {
    // Ensure the collections array is valid
    if (!collections || !Array.isArray(collections)) {
      throw new CustomError("Invalid collections data", 400);
    }

    // Prepare collection documents
    const collectionDocuments = collections.map((collection) => ({
      userId,
      webflowsiteId:siteId,
      webflowCollectionId: collection.id,
      displayName: collection.displayName,
      singularName: collection.singularName,
      slug: collection.slug,
      createdOn: collection.createdOn || null,
      lastUpdated: collection.lastUpdated || null,
      liveItems: collection.liveItems || [],
      stagedItems: collection.stagedItems || [],
    }));

    // Save or update each collection in the database
    const savePromises = collectionDocuments.map(async (collectionDoc) => {
      return await Collection.findOneAndUpdate(
        { webflowCollectionId: collectionDoc.webflowCollectionId, userId }, // Filter criteria
        collectionDoc, // Data to save
        { upsert: true, new: true, setDefaultsOnInsert: true } // Options
      );
    });

    // Wait for all collections to be saved
    const savedCollections = await Promise.all(savePromises);

    return savedCollections;
  } catch (error) {
    console.error("Error in saveWebflowCollections:", error.message);
    throw new CustomError("Failed to save Webflow collections", 500);
  }
};


/**
 * Count documents in the Collection model based on filter parameters
 * @param {Object} filter - Filter object to match documents (e.g., { userId, webflowsiteId })
 * @returns {Promise<number>} - Returns the count of matching documents
 */
const countCollectionDocuments = async (filter) => {
  try {
    if (!filter || typeof filter !== "object") {
      throw new CustomError("Filter must be a valid object", 400);
    }

    const count = await Collection.countDocuments(filter);
    return count;
  } catch (error) {
    console.error("Error in countCollectionDocuments Service:", error.message);
    throw new CustomError(
      error.message || "Failed to count documents in collection",
      500
    );
  }
};

module.exports = { fetchAndSaveUserCollections ,countCollectionDocuments};
