const express = require('express');
const router = express.Router();



router.get('/', async function (req, res, next) {
  try {
    res.render('index.ejs');
  } catch (err) {
    console.error(`Error while getting Tp Follow`, err.message);
    // next(err);
    res.render('index.ejs');
  }
});

module.exports=router;