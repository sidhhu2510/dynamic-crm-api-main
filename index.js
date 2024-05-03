const express = require('express');
const cors = require("cors");
const cookieParser = require('cookie-parser')
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const app = express();
const PORT = process.env.APP_PORT || 9000;
// Import the all routes from routes.js
const router = require("./routes/routes");
const webRoutes=require('./routes/web/web')
app.use('/', webRoutes);

// Import the USER class from user.js
const USER = require("./services/user");
// Execute the checkUserTable function when the application starts
USER.checkTable();
app.use(express.static(path.join(__dirname, 'public')));
var corsOptions = {
    origin: process.env.APP_URL || "http://localhost" + ":" + PORT
};

app.use(cors(corsOptions));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(cookieParser())
app.use(bodyParser.json())
app.use('/', router);
app.listen(PORT, () => {
    console.log(`Example app listening on port ${process.env.APP_URL || "http://localhost"}:${PORT}`)
})
global.__basedir = __dirname;
