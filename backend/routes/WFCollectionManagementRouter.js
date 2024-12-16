const express = require('express');
const router = express.Router();

const {fetchUserCollectionsFromWebflow}= require ('../controller/webflowCollectionController')


router.get('/fetchUserCollectionsFromWebflow/:userId', fetchUserCollectionsFromWebflow);






module.exports = router;