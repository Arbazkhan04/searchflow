const express = require("express");
const router = express.Router();
const { fetchPagesFromWebflow } = require("../controller/webFlowPagesController")

/**
 * Route to fetch and save Webflow pages
 * @route GET /api/webFlowPagesManagement/:userId
 * @queryParam {string} siteId - The ID of the site to fetch pages for
 */
router.get("/fetchUserSitePages/:userId", fetchPagesFromWebflow )

module.exports = router;
