const Site = require("../modals/webFLowSitesModel");
const Collection = require("../modals/webFlowCollectionModel");
const Item = require("../modals/webFlowItemModel");
const Product = require("../modals/webFLowProductsModel");
const CustomError = require("../utils/customError");
const axios = require("axios");
const qs = require("qs");
const he = require("he");
const User = require("../modals/userManagementModal");

const Page = require("../modals/webFlowPageModel");

const {
  fetchAndSaveUserSites,
} = require("../services/WFSitesManagementService.js");
const {
  fetchAndSaveUserCollections,
  countCollectionDocuments,
} = require("../services/WFCollectionManagementService.js");
const { fetchAndSaveSiteItems, countItemDocuments } = require("../services/WFLiveItemsManagementService.js");
const { fetchAndSaveProducts, countProductDocuments } = require("../services/WFProductsManagementService.js");
const { fetchAndSavePages } = require("../services/WFPagesManagementService.js");


/**
 * Generate dashboard response for all user-connected sites
 * @param {string} userId - ID of the user
 * @returns {Promise<Array>} - Array of site responses
 */
const generateDashboardResponse = async (userId) => {
  try {
    if (!userId) {
      throw new CustomError("User ID is required", 400);
    }

    // Fetch all connected sites for the user
    const sites = await Site.find({ userId }).sort({ updatedAt: -1 });

    // If no sites are found, return an empty response
    if (!sites || sites.length === 0) {
      return [
        {
          websiteName: "No site connected",
          lastSync: null,
          status: "Not Connected",
          totalCollections: 0,
          totalItems: 0,
          totalProducts: 0,
        },
      ];
    }

    // Generate response for each site
    const siteSummaries = await Promise.all(
      sites.map(async (site) => {
        const siteId = site?.webflowSiteId;

        // Use service methods to count documents
        const [collectionsCount, itemsCount, productsCount] = await Promise.all([
          countCollectionDocuments({userId,webflowsiteId:siteId}),
          countItemDocuments({userId, siteId}),
          countProductDocuments({userId, siteId}),
        ]);

        console.log("collection count",collectionsCount)

        return {
          websiteName: site.displayName || "No Name",
          lastSync: site.updatedAt || site.createdAt,
          status: "Connected",
          totalCollections: collectionsCount,
          totalItems: itemsCount,
          totalProducts: productsCount,
        };
      })
    );

    return siteSummaries;
  } catch (error) {
    console.error("Error generating dashboard response:", error.message);
    throw new CustomError(
      error.message || "Failed to generate dashboard response",
      500
    );
  }
};


/**
 * Generate Webflow OAuth URL for user authorization
 * @param {string} userId - User's ID
 * @returns {string} - Webflow OAuth URL
 */
const generateWebflowOAuthUrl = (userId) => {
  try {
    const ClientId = process.env.WEBFLOW_CLIENT_ID;
    const redirectURI = process.env.REDIRECT_URI;

    // Encode userId in state
    const state = encodeURIComponent(JSON.stringify({ userId }));

    // Add required scopes for OAuth
    const scopes = encodeURIComponent(
      "sites:read cms:read ecommerce:read pages:read"
    );

    // Construct OAuth URL
    return `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}&scope=${scopes}`;
  } catch (error) {
    throw new CustomError("Failed to generate Webflow OAuth URL", 500);
  }
};

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code received from Webflow
 * @param {string} state - Encoded state string
 * @returns {string} - Webflow access token
 */
const fetchWebflowAccessToken = async (code, state) => {
  try {
    // Decode and parse state parameter
    const htmlDecodedState = he.decode(state);
    const { userId } = JSON.parse(htmlDecodedState);

    const url = "https://api.webflow.com/oauth/access_token";
    const data = qs.stringify({
      client_id: process.env.WEBFLOW_CLIENT_ID,
      client_secret: process.env.WEBFLOW_CLIENT_SECRET,
      code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: "authorization_code",
    });

    // Make POST request to get access token
    const response = await axios.post(url, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = response?.data?.access_token;
    if (!accessToken) {
      throw new CustomError("Failed to fetch access token", 500);
    }

    // Save access token to user in DB
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }
    user.webflowAccessToken = accessToken;
    await user.save();

    return accessToken;
  } catch (error) {
    console.error("Error fetching Webflow access token:", error.message);
    throw new CustomError(error.message || "Failed to fetch access token", 500);
  }
};












/**
 * Fetch and save all Webflow data (sites, collections, items, products, pages)
 * and return formatted response for the dashboard.
 *
 * @param {string} userId - The ID of the user
 * @param {string} accessToken - Webflow access token for the user
 * @returns {Promise<Array>} - Array of site data with summarized response
 */
const fetchAndSaveAllUserData = async (userId, accessToken) => {
  try {
    if (!userId || !accessToken) {
      throw new CustomError("User ID and access token are required", 400);
    }

    // Step 1: Fetch and save user sites
    const siteFetchResult = await fetchAndSaveUserSites(userId, accessToken);

    console.log("site fetch Result", siteFetchResult)
    const siteIds = siteFetchResult?.data.map((site) => site.webflowSiteId);

    // Step 2: Fetch collections, items, pages, and products for all sites
    const fetchTasks = siteIds.map(async (siteId) => {
      await Promise.all([
        fetchAndSaveUserCollections(userId, siteId, accessToken),
        fetchAndSaveSiteItems(userId, siteId, accessToken),
        fetchAndSavePages(userId, siteId, accessToken),
        fetchAndSaveProducts(userId, siteId, accessToken),
      ]);
    });

    // Execute all fetch tasks concurrently
    await Promise.all(fetchTasks);

    // Step 3: Generate response for all sites
    const sites = await Site.find({ userId }).sort({ updatedAt: -1 });

    const siteSummaries = await Promise.all(
      sites.map(async (site) => {
        const siteId = site._id;

        // Fetch counts for collections, items, and products
        const [collectionsCount, itemsCount, productsCount] = await Promise.all([
          Collection.countDocuments({ userId, webflowsiteId:siteId }),
          Item.countDocuments({ userId, siteId }),
          Product.countDocuments({ userId, siteId }),
        ]);



        return {
          websiteName: site.displayName || "No Name",
          lastSync: site.updatedAt || site.createdAt,
          status: "Connected",
          totalCollections: collectionsCount,
          totalItems: itemsCount,
          totalProducts: productsCount,
        };
      })
    );

    return siteSummaries;
  } catch (error) {
    console.error("Error in fetchAndSaveAllUserData Service:", error.message);
    throw new CustomError(
      error.message || "Failed to fetch and save all user data",
      500
    );
  }
};





module.exports = {
  generateDashboardResponse,
  generateWebflowOAuthUrl,
  fetchWebflowAccessToken,
  fetchAndSaveAllUserData
};
