const express = require('express');
const router = express.Router();
const User = require('../../services/user')

// Route to fetch data from a specific table
router.get('/', User.verify, (req, res) => {
    try {
        var user = req.user;
        User.info(user, (err, data) => {
            if (err) {
                res.status(500).render('templates/login.ejs', {
                    status: false,
                    message: err.message || err || "Data retrieval failed"
                });
            } else {
                res.render('user/userlist.ejs', data);
            }
        });
    } catch (err) {
        console.error(`Error while getting data`, err.message);
        res.status(500).redirect('/');
    }
});

router.get('/register', async function (req, res, next) {
    try {
        // res.render('userlist/register.ejs');
        User.getRoleTitles((err, results) => {
            if (err) {
                // Handle error
                return res.status(500).send("Error fetching role titles");
            }
            // Render the EJS template and pass roleTitles data to it
            res.render('templates/pages-register.ejs', { results: results });
        });
    } catch (err) {
        console.error(`Error while getting user list`, err.message);
        next(err);
    }

});

router.post('/register', async function (req, res, next) {
    // try {
        const { userName, email, password, confirmPassword, userRoleId } = req.body;

        // Check if any required field is missing
        if (!userName || !email || !password || !confirmPassword || !userRoleId) {
            
            User.getRoleTitles((err, results) => {
                if (err) {
                    // Handle error
                    return res.status(500).send("Error fetching role titles");
                }
                // Render the EJS template and pass roleTitles data to it
                res.render('templates/pages-register.ejs', {
                    status: false,
                    message: err.message || err || "Content can not be empty!", 
                    results: results
                });
            });
            // return res.render('templates/pages-register.ejs', { status: false, message: "Content can not be empty!" });
        }

        // Check if the passwords match
        if (password !== confirmPassword) {
            
            User.getRoleTitles((err, results) => {
                if (err) {
                    // Handle error
                    return res.status(500).send("Error fetching role titles");
                }
                // Render the EJS template and pass roleTitles data to it
                res.render('templates/pages-register.ejs', {
                    status: false,
                    message: err.message || err || "Passwords did not match!" ,
                    results: results
                });
            });
            // return res.render('templates/pages-register.ejs', { status: false, message: "Passwords did not match!" });
        }

        // Hash the password
        // const hashedPassword = await bcrypt.hash(passWord, 10);
        User.register(userName, email, password, userRoleId, (err, results, resCode) => {
            if (err) {
                User.getRoleTitles((err, results) => {
                    if (err) {
                        // Handle error
                        return res.status(500).send("Error fetching role titles");
                    }
                    // Render the EJS template and pass roleTitles data to it
                    res.render('templates/pages-register.ejs', {
                        status: false,
                        message: err.message || err || "Some error occurred while creating the user.", 
                        results: results
                    });
                });
                // return res.render('templates/pages-register.ejs', {
                //     status: false,
                //     message: err.message || err || "Some error occurred while creating the user."
                // });
            }
            // If registration is successful, redirect to another page or render another template
            res.redirect('/');
        });
    // } catch (err) {
    //     console.error(`Error while registering user`, err.message);
    //     res.status(500).render('templates/pages-register.ejs', {
    //         status: false,
    //         message: "Internal server error"
    //     });
    // }
});

router.get('/login', (req, res) => {
    res.render('login.ejs',);

});

router.post('/login', async (req, res) => {
    try {
        console.log(req.body)
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).render('login', {
                message: "You need to enter both email and password"
            });
        }

        User.login(email, password, (error, data, resCode) => {
            if (error) {
                // Handle error
                console.log(error);
                res.status(500).render('login', {
                    message: "Internal server error1"
                });
            } else {
                // Token is generated successfully
                if (data.status == true) {

                    var cookieOptions = {
                        expiresIn: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 10 * 60 * 60 * 1000),
                        httpOnly: true
                    };
                    console.log('Token:', data.token);
                    console.log('Cookie Options:', cookieOptions);
                    // console.log('Status code:', statusCode);

                    // Redirect to the homepage and set the token as a cookie
                    res.cookie('jwt', data.token, cookieOptions);
                    res.redirect('/');
                    console.log('redirect To index:');

                } else {
                    res.status(resCode || 301).render('login.ejs', data);
                }
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('login.ejs', {
            message: "Internal server error"
        });
    }
});

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password.ejs',);

});
// Route to send OTP for forgot password
router.post('/forgot-password', (req, res) => {
    try {
        const { email } = req.body;
        User.forgotPassword(email, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).render('/forgot-password.ejs', {
                    status: false,
                    message:
                        err.message || err || "Forgot password operation failed"
                });
            else res.status(resCode || 200).render('reset-password.ejs');
        })
    } catch (err) {
        console.error(`Error while getting forgot password operation: `, err.message);
        // next(err);
        res.status(500).render('/forgot-password.ejs', {
            status: false,
            message:
                err.message || err || "Forgot password operation failed"
        });
    }
});

router.get('/reset-password', (req, res) => {
    res.render('reset-password.ejs',);

});
// Route to reset password
router.post('/reset-password', (req, res) => {
    try {
        const { email, token, password, confirmPassword } = req.body;
        User.resetPassword(email, token, password, confirmPassword, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "Reset password failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting reset password : `, err.message);
        // next(err);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "Reset password failed"
        });
    }
});

router.get('/change-password', (req, res) => {
    res.render('templates/change-password.ejs',);

});

// Route to change password
router.post('/change-password', User.verify, (req, res) => {
    try {
        const user = req.user;
        const { password, newPassword, newConfirmPassword } = req.body;
        User.changePassword(user, password, newPassword, newConfirmPassword, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).render('/templates/change-password.ejs', {
                    status: false,
                    message:
                        err.message || err || "Change password failed"
                });
            else res.status(resCode || 200).redirect('/');
        })
    } catch (err) {
        console.error(`Error while getting change password : `, err.message);
        // next(err);
        res.status(500).render('/templates/change-password.ejs', {
            status: false,
            message:
                err.message || err || "Change password failed"
        });
    }
});

module.exports = router;