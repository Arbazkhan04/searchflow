const axios = require("axios");
const CustomError = require("../utils/customError.js");
const Page = require("../modals/webFlowPageModel.js");

/**
 * Fetch and save pages for a site from Webflow
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Object>} - Success message and saved page documents
 */
const fetchAndSavePages = async (userId, siteId, accessToken) => {
  try {
    // Validate input
    if (!accessToken) {
      throw new CustomError("Webflow access token is required", 400);
    }

    // Webflow API endpoint for fetching pages
    const fetchPagesUrl = `https://api.webflow.com/v2/sites/${siteId}/pages`;
    
    // Fetch pages from Webflow
    const response = await axios.get(fetchPagesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "accept-version": "2.0.0",
      },
    });
    console.log(response.data)

    const pages  = response.data?.pages || {};
console.log(pages)
    if (!pages || !pages.length) {
      return { success: true, message: "No pages found for the site" };
    }

    // Save pages to the database
    const savedPages = await savePages(userId, siteId, pages);

    return {
      success: true,
      message: "Pages fetched and saved successfully",
      data: savedPages,
    };
  } catch (error) {
    console.error("Error in fetchAndSavePages:", error.message);
    throw new CustomError(
      error.response?.data?.message || "Failed to fetch pages for the site",
      error.response?.status || 500
    );
  }
};

/**
 * Save fetched pages to the database
 * @param {string} userId - The ID of the user
 * @param {string} siteId - The ID of the site
 * @param {Array} pages - Array of pages fetched from Webflow API
 * @returns {Promise<Array>} - List of saved page documents
 */
const savePages = async (userId, siteId, pages) => {
  try {
    // Ensure the pages array is valid
    if (!pages || !Array.isArray(pages)) {
      throw new CustomError("Invalid pages data", 400);
    }

    // Prepare page documents
    const pageDocuments = pages.map((page) => ({
      webFlowPageId: page.id,
      webFlowSiteId: siteId,
      userId,
      title: page.title,
      slug: page.slug,
      createdOn: page.createdOn || null,
      lastUpdated: page.lastUpdated || null,
      archived: page.archived || false,
      draft: page.draft || false,
      canBranch: page.canBranch || false,
      isBranch: page.isBranch || false,
      isMembersOnly: page.isMembersOnly || false,
      seo: {
        title: page.seo?.title || null,
        description: page.seo?.description || null,
      },
    }));

    // Save or update each page in the database
    const savePromises = pageDocuments.map(async (pageDoc) => {
      return await Page.findOneAndUpdate(
        { webFlowPageId: pageDoc.webFlowPageId, webFlowSiteId:siteId }, // Filter criteria
        { $set: pageDoc }, // Use `$set` to avoid overwriting fields unnecessarily
        { upsert: true, new: true, setDefaultsOnInsert: true } // Options
      );
    });

    // Wait for all pages to be saved
    const savedPages = await Promise.all(savePromises);

    return savedPages;
  } catch (error) {
    console.error("Error in savePages:", error.message);
    throw new CustomError("Failed to save pages", 500);
  }
};

module.exports = { fetchAndSavePages };
