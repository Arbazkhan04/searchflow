const express = require('express');
const router = express.Router();

const {connectWebFlowAccount,getWebFlowAccessToken}= require ('../controller/webFlowManagementController')


router.get('/connectToWebFlowAccount/:userId', connectWebFlowAccount);

router.get('/getWebFlowAccessToken', getWebFlowAccessToken);





module.exports = router;