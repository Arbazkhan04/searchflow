const express = require('express');
const router = express.Router();

const {connectWebFlowAccount,getWebFlowAccessToken,getDashboardData}= require ('../controller/webFlowManagementController')


router.get('/connectToWebFlowAccount/:userId', connectWebFlowAccount);

router.get('/getWebFlowAccessToken', getWebFlowAccessToken);
router.get('/getDashboardData/:userId', getDashboardData)






module.exports = router;