var router = require('express').Router();
const ApiRouter = require("./api/api");
// app router perform table level operations
router.use('/api', ApiRouter);

module.exports = router;