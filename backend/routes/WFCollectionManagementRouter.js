const express = require('express');
const router = express.Router();

const {fetchUserCollectionsFromWebflow,getCollectionCount}= require ('../controller/webflowCollectionController')


router.get('/fetchUserCollectionsFromWebflow/:userId', fetchUserCollectionsFromWebflow);
router.get('/getCollectionCount/:userId', getCollectionCount);







module.exports = router;