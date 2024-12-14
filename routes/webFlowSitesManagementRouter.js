const express = require('express');
const router = express.Router();

const {fetchUserSitesFromWebflow}= require ('../controller/webflowSitesManagementController')


router.get('/fetchUserSitesFromWebflow/:userId', fetchUserSitesFromWebflow);






module.exports = router;