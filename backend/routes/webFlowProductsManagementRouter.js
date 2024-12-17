const express = require("express");
const router = express.Router();

const {
    fetchProductsFromWebflow,getProductCount
} = require("../controller/webFLowProductsController");

/**
 * Route to fetch and save Webflow products
 * @route GET /api/webFlowProductsManagement/:userId
 * @queryParam {string} siteId - The ID of the site to fetch products for
 */
router.get("/fetchUserProductsFromWebFlow/:userId", fetchProductsFromWebflow);
router.get('/getProductCount/:userId', getProductCount);




module.exports = router;
