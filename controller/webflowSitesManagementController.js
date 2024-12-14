const CustomError = require("../utils/customError.js");
const responseHandler = require("../utils/responseHandler.js");
const User = require("../modals/userManagementModal");
const he = require("he");
const axios = require("axios");
const qs = require("qs"); // For URL-encoding the request body
const getUserAccessToken = require("../utils/getUserAccessToken.js");

const fetchUserSitesFromWebflow = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Fetch user Webflow access token
    const webflowAccessToken = await getUserAccessToken(userId);
    console.log("Webflow Access Token:", webflowAccessToken);

    if (!webflowAccessToken) {
      throw new CustomError("User does not have a Webflow access token.", 401);
    }

    // Webflow API endpoint to fetch sites
    const fetchSitesUrl = "https://api.webflow.com/v2/sites";

    // Fetch sites from Webflow
    const fetchSitesResponse = await axios.get(fetchSitesUrl, {
      headers: {
        Authorization: `Bearer ${webflowAccessToken}`, 
        "accept-version": "2.0.0",
      },
    });

    const userSites = fetchSitesResponse.data; // Extract data from response

    console.log("Fetched User Sites:", userSites);

    // Send response to client
    responseHandler(res, 200, "Fetched user sites successfully", userSites);
  } catch (error) {
    console.error("Error fetching user sites from Webflow:", error.message);
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};

module.exports = {fetchUserSitesFromWebflow};
