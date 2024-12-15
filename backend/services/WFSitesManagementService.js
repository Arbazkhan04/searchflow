const axios = require("axios");
const CustomError = require("../utils/customError.js");
const Site = require("../modals/webFLowSitesModel.js");

/**
 * Fetch all sites for a user from Webflow and save them to the database
 * @param {string} userId - The ID of the user
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved site documents
 */
const fetchAndSaveUserSites = async (userId, accessToken) => {
  try {
    // Validate input
    if (!accessToken) {
      throw new CustomError("Webflow access token is required", 400);
    }

    // Webflow API endpoint
    const fetchSitesUrl = "https://api.webflow.com/v2/sites";

    // Fetch sites from Webflow
    const response = await axios.get(fetchSitesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });

    const { sites } = response.data || {};

    if (!sites || !sites.length) {
      return { success: true, message: "User has no sites" };
    }

    // Save sites to database
    const savedSites = await saveWebflowSites(userId, sites);

    return {
      success: true,
      message: "User sites fetched and saved successfully",
      data: savedSites,
    };
  } catch (error) {
    console.error("Error in fetchAndSaveUserSites:", error.message);
    throw new CustomError(
      error.response?.data?.message || "Failed to fetch user sites",
      error.response?.status || 500
    );
  }
};

/**
 * Save fetched sites to the database
 * @param {string} userId - The ID of the user
 * @param {Array} sites - Array of sites fetched from Webflow API
 * @returns {Promise<Array>} - List of saved site documents
 */
const saveWebflowSites = async (userId, sites) => {
  try {
    // Ensure the sites array is valid
    if (!sites || !Array.isArray(sites)) {
      throw new CustomError("Invalid sites data", 400);
    }

    // Prepare site documents
    const siteDocuments = sites.map((site) => ({
      userId,
      webflowSiteId: site.id,
      displayName: site.displayName,
      shortName: site.shortName,
      previewUrl: site.previewUrl,
      timeZone: site.timeZone,
      createdOn: site.createdOn,
      lastUpdated: site.lastUpdated,
      lastPublished: site.lastPublished,
      parentFolderId: site.parentFolderId || null,
      customDomains: site.customDomains || [],
      locales: site.locales,
      dataCollectionEnabled: site.dataCollectionEnabled || false,
      dataCollectionType: site.dataCollectionType || "always",
    }));

    // Save or update each site in the database
    const savePromises = siteDocuments.map(async (siteDoc) => {
      return await Site.findOneAndUpdate(
        { webflowSiteId: siteDoc.webflowSiteId, userId }, // Filter criteria
        siteDoc, // Data to save
        { upsert: true, new: true, setDefaultsOnInsert: true } // Options
      );
    });

    // Wait for all sites to be saved
    const savedSites = await Promise.all(savePromises);

    return savedSites;
  } catch (error) {
    console.error("Error in saveWebflowSites:", error.message);
    throw new CustomError("Failed to save Webflow sites", 500);
  }
};

module.exports = { fetchAndSaveUserSites };
