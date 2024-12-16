const { fetchAndSavePages } = require("../services/WFPagesManagementService.js");
const getUserAccessToken = require("../utils/getUserAccessToken.js");
const responseHandler = require("../utils/responseHandler.js");
const CustomError = require("../utils/customError.js");

/**
 * Controller to fetch and save pages from Webflow
 */
const fetchPagesFromWebflow = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const siteId = req.query.siteId;

    if (!siteId) {
      throw new CustomError("Site ID is required in the query string.", 400);
    }

    // Fetch user's access token
    const accessToken = await getUserAccessToken(userId);
    if (!accessToken) {
      throw new CustomError("User does not have a Webflow access token.", 401);
    }

    // Fetch and save pages
    const result = await fetchAndSavePages(userId, siteId, accessToken);

    responseHandler(res, 200, result.message, result.data);
  } catch (error) {
    console.error("Error in fetchPagesFromWebflow Controller:", error.message);
    next(error instanceof CustomError ? error : new CustomError(error.message, 500));
  }
};

module.exports = { fetchPagesFromWebflow };
