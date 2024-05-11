var router = require('express').Router();
const ApiRouter = require("./api/api");
const webRoutes=require('./web/web');
// app router perform table level operations

router.use('/api', ApiRouter);
router.use('/', webRoutes);
module.exports = router;