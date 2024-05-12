const router = require('express').Router();
const User = require('../../services/user')

const index = require('./index');
router.use('/', index);

const user = require('./user');
router.use('/user', user);

const role_permission = require('./role-permission');
router.use('/role-permission', role_permission);

router.get('/role',(req,res)=>{
    res.render('createRole.ejs')
})


module.exports = router;