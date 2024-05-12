const connection = require("../config/db");
const moment = require('moment');

class RolesAndPermissions {

    static createRole(title, callBack) {
        // Generate SQL query to insert data to the user_role table
        const sql = `INSERT INTO user_role SET ?`;

        connection.query(sql, { title }, (err, result) => {
            if (err) {
                console.error('Error getting role creation:', err);
                callBack(err, null);
                return;
            } else {              
                callBack(null, { status: true, message: "Role created successfully", data: result });
            }
        });
    }

    static getRolesWithPermissions(callBack) {
        // SQL query to fetch list of roles
        const roleSql = `SELECT * FROM user_role WHERE isActive = '1'`;

        connection.query(roleSql, (err, roles) => {
            if (err) {
                console.error('Error getting roles:', err);
                callBack(err, null);
            } else {
              
               
                // Array to store promises for fetching role permissions
                const promises = roles.map(role => {
                    return new Promise((resolve, reject) => {
                        // SQL query to fetch role permissions with modules
                        const permissionSql = `
                            SELECT role_permissions.*, modules.tableName AS moduleTitle
                            FROM role_permissions
                            JOIN modules ON role_permissions.moduleId = modules.id
                            WHERE role_permissions.userRoleId = ?`;

                        connection.query(permissionSql, [role.id], (err, permissions) => {
                            if (err) {
                                console.error(`Error getting permissions for role ${role.id}:`, err);
                                reject(err);
                            } else {
                                role.permissions = permissions;
                                resolve(role);
                            }
                        });
                    });
                });

                // Execute all promises and handle callback
                Promise.all(promises)
                    .then(rolesWithPermissions => {
                        rolesWithPermissions.forEach(entry => {
                            entry.createdAt = moment(entry.createdAt).format('YYYY-MM-DD HH:mm'); 
                            entry.updatesAt = moment(entry.updatesAt).format('YYYY-MM-DD HH:mm'); 
                        }); 
                       
                        callBack(null, { status: true, message: "Roles with permissions fetched successfully", data: rolesWithPermissions });
                    })
                    .catch(err => {
                        console.error('Error fetching roles with permissions:', err);
                        callBack(err, null);
                    });
            }
        });
    }

    static getRoleWithPermissionsById(id, callBack) {
        // SQL query to fetch list of roles
        const roleSql = `SELECT * FROM user_role WHERE isActive = '1' AND id=?`;

        connection.query(roleSql, [id], (err, roles) => {
            if (err) {
                console.error('Error getting roles:', err);
                callBack(err, null);
            } else {
                // Array to store promises for fetching role permissions
                const promises = roles.map(role => {
                    return new Promise((resolve, reject) => {
                        // SQL query to fetch role permissions with modules
                        const permissionSql = `
                            SELECT role_permissions.*, modules.tableName AS moduleTitle
                            FROM role_permissions
                            JOIN modules ON role_permissions.moduleId = modules.id
                            WHERE role_permissions.userRoleId = ?`;

                        connection.query(permissionSql, [role.id], (err, permissions) => {
                            if (err) {
                                console.error(`Error getting permissions for role ${role.id}:`, err);
                                reject(err);
                            } else {
                                role.permissions = permissions;
                                resolve(role);
                            }
                        });
                    });
                });

                // Execute all promises and handle callback
                Promise.all(promises)
                    .then(rolesWithPermissions => {
                        callBack(null, { status: true, message: "Roles with permissions fetched successfully", data: rolesWithPermissions[0] });
                    })
                    .catch(err => {
                        console.error('Error fetching roles with permissions:', err);
                        callBack(err, null);
                    });
            }
        });
    }

    static updateRoleWithPermissionsById(id, title, permissions, callBack) {
        // Validate userRoleId in permissions
        const isValidPermissions = permissions.every(permission => permission.userRoleId === parseInt(id));
    
        if (!isValidPermissions) {
            return callBack({ status: false, message: "Invalid userRoleId in permissions list" }, null);
        }
    
        // Update role title
        const updateRoleSql = `UPDATE user_role SET title = ? WHERE id = ?`;
    
        connection.query(updateRoleSql, [title, id], (err, result) => {
            if (err) {
                console.error('Error updating role title:', err);
                return callBack({ status: false, message: "Error updating role title" }, null);
            }
    
            // Update permissions
            RolesAndPermissions.updatePermissions(permissions)
                .then(() => {
                    
                    callBack(null, { status: true, message: "Roles with permissions updated successfully",});
                })
                .catch(error => {
                    console.error('Error updating permissions:', error);
                    callBack({ status: false, message: "Error updating permissions" }, null);
                });
        });
    }

    static updatePermissions = (permissions) => {
        return new Promise((resolve, reject) => {
            const updateQueries = permissions.map(permission => {
                const updatePermissionSql = `
                    UPDATE role_permissions
                    SET 
                        getMethod = ?,
                        postMethod = ?,
                        putMethod = ?,
                        deleteMethod = ?
                    WHERE id = ? AND userRoleId = ?;
                `;
                const values = [
                    permission.getMethod,
                    permission.postMethod,
                    permission.putMethod,
                    permission.deleteMethod,
                    permission.id,
                    permission.userRoleId
                ];
                return new Promise((resolveQuery, rejectQuery) => {
                    connection.query(updatePermissionSql, values, (err, result) => {
                        if (err) {
                            console.error('Error updating permission:', err);
                            rejectQuery(err);
                        } else {
                            console.log('Permission updated successfully');
                            resolveQuery(result);
                        }
                    });
                });
            });
    
            Promise.all(updateQueries)
                .then(results => {
                    console.log('All permissions updated successfully');
                    resolve(results);
                })
                .catch(error => {
                    console.error('Error updating permissions:', error);
                    reject(error);
                });
        });
    };
}

module.exports = RolesAndPermissions;