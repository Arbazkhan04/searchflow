// const CustomError = require("../utils/customError.js");
// const responseHandler = require("../utils/responseHandler.js");
// const User = require("../modals/userManagementModal");
// const he = require("he");
// const axios = require("axios");
// const qs = require("qs"); // For URL-encoding the request body

// const connectWebFlowAccount = async (req, res, next) => {
//   try {
//     const userId = req.params.userId;
//     console.log("user id in connectwebflowaccount", userId);
//     const ClientId = process.env.WEBFLOW_CLIENT_ID;
//     const redirectURI = process.env.REDIRECT_URI;

//     const findUser = await User.findById(userId);
//     //If the user already don't have webflow access token then proceed with webflow oauth process othewise redirect user to user dashboard

//     if (!findUser?.webflowAccessToken) {
//       // Encode userId in the state parameter
//       const state = encodeURIComponent(JSON.stringify({ userId }));
//       // const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}`;

//       // const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}&scope=sites:read`;
//       // const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}&scope=${encodeURIComponent('sites:read cms:read')}`;
//       // const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}&scope=${encodeURIComponent('sites:read cms:read ecommerce:read')}`;
//       const url = `https://webflow.com/oauth/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${redirectURI}&state=${state}&scope=${encodeURIComponent('sites:read cms:read ecommerce:read pages:read')}`;

//       console.log("state at first place", state);
//       return res.redirect(302, url);
//     }

//     return res.redirect(302, process.env.USERDASHBOARD_URL);
//   } catch (error) {
//     next(
//       error instanceof CustomError ? error : new CustomError(error.message, 500)
//     );
//   }
// };

// const getWebFlowAccessToken = async (req, res, next) => {
//   try {
//     const code = req.query?.code; // Get authorization code from query
//     const state = req.query?.state; // Get state parameter from query
//     console.log("State received:", state);

//     // Decode HTML entities in the state parameter
//     const htmlDecodedState = he.decode(state);
//     console.log("HTML Decoded State:", htmlDecodedState);

//     // Parse the JSON string after decoding
//     const { userId } = JSON.parse(htmlDecodedState);
//     console.log("User ID:", userId);

//     const url = "https://api.webflow.com/oauth/access_token";
//     const ClientId = process.env.WEBFLOW_CLIENT_ID;
//     const redirectURI = process.env.REDIRECT_URI;
//     const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;

//     const data = qs.stringify({
//       client_id: ClientId,
//       client_secret: clientSecret,
//       code: code,
//       redirect_uri: redirectURI,
//       grant_type: "authorization_code",
//     });

//     const response = await axios.post(url, data, {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     });

//     const accessToken = response?.data?.access_token;

//     if (accessToken) {
//       // Save the access token to the database for the user
//       const user = await User.findById(userId);
//       user.webflowAccessToken = accessToken;
//       await user.save();
//     }

//     console.log("Access Token:", accessToken);
//     res.redirect(302, process.env.USERDASHBOARD_URL);
//   } catch (error) {
//     next(
//       error instanceof CustomError ? error : new CustomError(error.message, 500)
//     );
//   }
// };

// module.exports = {
//   connectWebFlowAccount,
//   getWebFlowAccessToken,
// };

const {
  generateWebflowOAuthUrl,
  fetchWebflowAccessToken,
  generateDashboardResponse,
  fetchAndSaveAllUserData,
} = require("../services/webFlowManagementService");
const responseHandler = require("../utils/responseHandler");
const User = require("../modals/userManagementModal");
const CustomError = require("../utils/customError");

/**
 * Controller to initiate Webflow OAuth authorization
 */
const connectWebFlowAccount = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const USERDASHBOARD_URL = process.env.USERDASHBOARD_URL;
    if (!userId) {
      throw new CustomError("User ID is required", 400);
    }

    const findUser = await User.findById(userId);
    if (findUser?.webflowAccessToken) {
      return res.redirect(302, USERDASHBOARD_URL);
    }

    // Generate OAuth URL
    const oauthUrl = generateWebflowOAuthUrl(userId);

    // Redirect user to Webflow OAuth URL
    return res.redirect(302, oauthUrl);
  } catch (error) {
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};

/**
 * Controller to handle Webflow OAuth callback and fetch access token
 */
const getWebFlowAccessToken = async (req, res, next) => {
  try {
    const code = req.query?.code;
    const state = req.query?.state;

    if (!code || !state) {
      throw new CustomError("Missing code or state parameter", 400);
    }

    // Fetch access token and save it to the user
    const accessToken = await fetchWebflowAccessToken(code, state);

    console.log("Access Token:", accessToken);

    // Redirect to dashboard
    return res.redirect(302, process.env.USERDASHBOARD_URL);
  } catch (error) {
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};

/**
 * Controller to fetch dashboard data and sync Webflow data if necessary
 */

const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      throw new CustomError("User ID is required", 400);
    }

    // Fetch user data
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Destructure webflowDataFetchedAndSaved fields
    const { sites, collections, items, pages, products } =
      user.webflowDataFetchedAndSaved || {};

    // Check if all Webflow data is fetched
    const allDataFetched = sites && collections && items && pages && products;

    let calculatedRecord;

    if (allDataFetched) {
      // All data is already fetched, generate dashboard response
      calculatedRecord = await generateDashboardResponse(userId);

      return responseHandler(
        res,
        200,
        "Dashboard data fetched successfully",
        calculatedRecord
      );
    }

    // If any data is not fetched, fetch and save all data
    await fetchAndSaveAllUserData(userId,user?.webflowAccessToken);

    // Generate dashboard response after fetching and saving data
    calculatedRecord = await generateDashboardResponse(userId);

    return responseHandler(
      res,
      200,
      "Dashboard data fetched and updated successfully",
      calculatedRecord
    );
  } catch (error) {
    next(
      error instanceof CustomError ? error : new CustomError(error.message, 500)
    );
  }
};

module.exports = {
  connectWebFlowAccount,
  getWebFlowAccessToken,
  getDashboardData,
};
