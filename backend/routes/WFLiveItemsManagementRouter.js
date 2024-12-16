const express = require("express");
const router = express.Router();

const {
  fetchItemsFromWebflow,
} = require("../controller/webflowCollectionItemsController");

/**
 * Route to fetch and save Webflow items
 * @route GET /api/webFlowItemsManagement/:userId
 * @queryParam {string} collectionId - The ID of the collection to fetch items for
 */
router.get("/fetchLiveItems/:userId", fetchItemsFromWebflow);

module.exports = router;
