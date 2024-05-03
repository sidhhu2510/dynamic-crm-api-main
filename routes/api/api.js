var router = require('express').Router();
const AppRouter = require("./crud");
const UserRouter = require("./user");
const DynamicModelRouter = require("./dynamic-model");
const User = require("../../services/user");
// app router perform table level operations
// Define middleware to verify user
const verifyUser = (req, res, next) => {
    // Your verification logic here
    let tableName = req.params.tableName;
    req.tableName = tableName;
    console.log("Request URL:", req.originalUrl);
    console.log("Request params:", req.params);
    console.log("Requested tableName:", tableName);
    // Continue to the next middleware or route handler
    next();
};
router.use('/app/:tableName', User.verify, AppRouter);
router.use('/model', User.verify, DynamicModelRouter);
router.use('/user', UserRouter);

module.exports = router;