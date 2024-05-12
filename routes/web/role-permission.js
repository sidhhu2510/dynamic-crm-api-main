const express = require('express');
const router = express.Router();
const RolesAndPermissions = require('../../services/roles-permissions');
const { render } = require('ejs');

// Route to fetch data from a user_role & role_permissions table
router.get('/', async function (req, res) {
    try {
        RolesAndPermissions.getRolesWithPermissions((err, data, resCode) => {
            if (err) {
                res.status(resCode || 500).redirect('/', {
                    status: false,
                    message:
                        err.message || err || "Data retrieval failed"
                });
            }
            else {
               
                res.render('user_role.ejs', data);
            }

        })
    } catch (err) {
        console.error(`Error while getting data`, err.message);
        res.status(500).redirect('/', {
            status: false,
            message:
                err.message || err || "Data retrieval failed"
        });
    }

});
// Route to fetch data by user_role.id from a user_role & role_permissions table
router.get('/:id', async function (req, res) {
    try {
        const id = req.params.id;
        RolesAndPermissions.getRoleWithPermissionsById(id, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).render('user_role.ejs',{
                    status: false,
                    message:
                        err.message || err || "Data retrieval failed"
                });
            else res.status(resCode || 200).render('models.ejs',data);
            // console.log(data)
            // console.log(data.permissions)
        })
    } catch (err) {
        console.error(`Error while getting data`, err.message);
        res.status(500).render('user_role.ejs',{
            status: false,
            message:
                err.message || err || "Data retrieval failed"
        });
    }
});



// Route to insert data into a user_role table
router.post('/create', async function (req, res) {
    try {
        const { title } = req.body;
        RolesAndPermissions.createRole(title, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).render('user_role.ejs',{
                    status: false,
                    message:
                        err.message || err || "Data creation failed"
                });
            else res.status(resCode || 200).render('createRole.ejs',data);
        })
    } catch (err) {
        console.error(`Error while getting role creation: `, err.message);
        res.status(500).render('user_role.ejs',{
            status: false,
            message:
                err.message || err || "Data creation failed"
        });
    }
});
// Route to put data to user_role & role_permissions table
router.put('/:id', async function (req, res) {
    try {
        const id = req.params.id;
        const { title, permissions } = req.body;
        RolesAndPermissions.updateRoleWithPermissionsById(id, title, permissions, (err, data, resCode) => {
            if (err)
                res.status(resCode || 500).send({
                    status: false,
                    message:
                        err.message || err || "Data update failed"
                });
            else res.status(resCode || 200).send(data);
        })
    } catch (err) {
        console.error(`Error while getting data update`, err.message);
        res.status(500).send({
            status: false,
            message:
                err.message || err || "Data update failed"
        });
    }
});

module.exports = router;