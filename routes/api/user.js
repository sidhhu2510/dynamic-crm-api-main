const express = require('express');
const router = express.Router();
const User = require('../../services/user')


// Route to fetch data from a specific table
router.get('/', User.verify, (req, res) => {
    try {
        var user = req.user;
        User.info(user, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "Data retrieval failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting data`, err.message);
        // next(err);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "Data retrieval failed"
        });
    }
});
// Route to insert data into a specific table
router.post('/register', (req, res) => {
    try {
        const { userName, email, password, userRoleId } = req.body;
        User.register(userName, email, password, userRoleId, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "User registration failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting User registration: `, err.message);
        // next(err);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "User registration failed"
        });
    }
});
// Route to insert data into a specific table
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        User.login(email, password, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "Login failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting login: `, err.message);
        // next(err);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "Login failed"
        });
    }
});
// Route to send OTP for forgot password
router.post('/forgot-password', (req, res) => {
    try {
        const { email } = req.body;
        User.forgotPassword(email, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "Forgot password operation failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting forgot password operation: `, err.message);
        // next(err);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "Forgot password operation failed"
        });
    }
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
// Route to change password
router.post('/change-password', User.verify, (req, res) => {
    try {
        const user = req.user;
        const { password, newPassword, newConfirmPassword } = req.body;
        User.changePassword(user, password, newPassword, newConfirmPassword, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "Change password failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting change password : `, err.message);
        // next(err);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "Change password failed"
        });
    }
});

module.exports = router;
