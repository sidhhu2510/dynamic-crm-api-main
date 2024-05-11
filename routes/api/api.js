var router = require('express').Router();
const AppRouter = require("./crud");
const UserRouter = require("./user");
const DynamicModelRouter = require("./dynamic-model");
const RolesAndPermissionsRouter = require("./role-permissions");
const User = require("../../services/user");
// app router perform table level operations

router.use('/app/:tableName', User.verify, AppRouter);
router.use('/model', User.verifyAdmin, DynamicModelRouter);
router.use('/user', UserRouter);
router.use('/roles-permissions',User.verifyAdmin, RolesAndPermissionsRouter);


module.exports = router;