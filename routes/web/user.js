const express = require('express');
const user = require('../../services/user');
const router = express.Router();


router.get('/in', (req, res) => {
    res.render('index.ejs',);
 
 });
router.get('/user', (req, res) => {
    res.render('user_role.ejs',);
 
 });


 
router.get('/models', (req, res) => {
    res.render('models.ejs',);
 
 });

 module.exports = router;