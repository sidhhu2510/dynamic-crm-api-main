const connection = require("../config/db");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs'); // Import bcryptjs library
const nodemailer = require('nodemailer');
const { sendMail } = require('../utils/email')
const otpGenerator = require('otp-generator');
const express = require('express');
const app = express();

// Use cookie-parser middleware
app.use(cookieParser());

// Blacklist for revoked tokens
let revokedTokens = [];

class USER {
    static checkTable() {
        const createModulesTable = () => {
            return new Promise((resolve, reject) => {
                connection.query("SHOW TABLES LIKE 'modules'", (err, result) => {
                    if (err) return reject(err);

                    if (result.length === 0) {
                        const createModuleTableQuery = `
                        CREATE TABLE modules (
                            id int(11) AUTO_INCREMENT PRIMARY KEY,
                            tableName varchar(200) NOT NULL,
                            isActive int(11) NOT NULL DEFAULT 1,
                            createdAt timestamp NOT NULL DEFAULT current_timestamp(),
                            updatedAt timestamp NOT NULL DEFAULT current_timestamp()
                        )`;

                        connection.query(createModuleTableQuery, (err) => {
                            if (err) return reject(err);
                            console.log('Module table created');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        };
        const createUserRoleTable = () => {
            return new Promise((resolve, reject) => {
                connection.query("SHOW TABLES LIKE 'user_role'", (err, result) => {
                    if (err) return reject(err);

                    if (result.length === 0) {
                        // Create the user_role table
                        const createUserRoleTableQuery = `
                            CREATE TABLE user_role (
                                id int(11) AUTO_INCREMENT PRIMARY KEY,
                                title varchar(200) NOT NULL UNIQUE,
                                isActive int(11) NOT NULL DEFAULT 1,
                                createdAt timestamp NOT NULL DEFAULT current_timestamp(),
                                updatedAt timestamp NOT NULL DEFAULT current_timestamp()
                            )`;

                        connection.query(createUserRoleTableQuery, (err) => {
                            if (err) throw err;
                            console.log('User Role table created');

                            // Insert the 'Admin' role
                            const insertAdminRoleQuery = `INSERT INTO user_role (title) VALUES ('Admin')`;

                            connection.query(insertAdminRoleQuery, (err) => {
                                if (err) throw err;
                                console.log('Role "Admin" inserted');

                                // Create a trigger to prevent updates on the 'Admin' role
                                const preventAdminUpdateTrigger = `
                                    CREATE TRIGGER prevent_admin_update
                                    BEFORE UPDATE ON user_role
                                    FOR EACH ROW
                                    BEGIN
                                        IF OLD.title = 'Admin' THEN
                                            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update the Admin role';
                                        END IF;
                                    END`;

                                connection.query(preventAdminUpdateTrigger, (err) => {
                                    if (err) throw err;
                                    console.log('Trigger to prevent updates on Admin role created');

                                    // Create a trigger to prevent deletes on the 'Admin' role
                                    const preventAdminDeleteTrigger = `
                                        CREATE TRIGGER prevent_admin_delete
                                        BEFORE DELETE ON user_role
                                        FOR EACH ROW
                                        BEGIN
                                            IF OLD.title = 'Admin' THEN
                                                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete the Admin role';
                                            END IF;
                                        END`;

                                    connection.query(preventAdminDeleteTrigger, (err) => {
                                        if (err) throw err;
                                        console.log('Trigger to prevent deletes on Admin role created');
                                        resolve();
                                    });
                                });
                            });
                        });
                    } else {
                        resolve();
                    }
                });
            });
        };
        const createRolePermissionsTable = () => {
            return new Promise((resolve, reject) => {
                connection.query("SHOW TABLES LIKE 'role_permissions'", (err, result) => {
                    if (err) return reject(err);

                    if (result.length === 0) {
                        const createRolePermissionsTableQuery = `
                        CREATE TABLE role_permissions (
                            id int(11) AUTO_INCREMENT PRIMARY KEY,
                            userRoleId int(11) NOT NULL,
                            moduleId int(11) NOT NULL,
                            getMethod int(11) NOT NULL,
                            postMethod int(11) NOT NULL,
                            putMethod int(11) NOT NULL,
                            deleteMethod int(11) NOT NULL,
                            isActive int(11) NOT NULL DEFAULT 1,
                            createdAt timestamp NOT NULL DEFAULT current_timestamp(),
                            updatedAt timestamp NOT NULL DEFAULT current_timestamp(),
                            FOREIGN KEY (userRoleId) REFERENCES user_role(id) ON DELETE CASCADE,
                            FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE
                        )`;

                        connection.query(createRolePermissionsTableQuery, (err) => {
                            if (err) return reject(err);
                            console.log('Role Permissions table created');
                            // resolve();
                            const rolePermissionTrigger1 = `CREATE TRIGGER create_admin_role_permissions_trigger
                                AFTER INSERT ON modules
                                FOR EACH ROW
                                BEGIN
                                    DECLARE roleId INT;
                                    SET roleId = 1; -- Set the roleId to the desired userRoleId value
                            
                                    INSERT INTO role_permissions (userRoleId, moduleId, getMethod, postMethod, putMethod, deleteMethod)
                                    VALUES (roleId, NEW.id, 1, 1, 1, 1); -- Customize method values as needed
                                END`;

                            const rolePermissionTrigger2 = `CREATE TRIGGER prevent_admin_delete_update_role_permissions_trigger
                                BEFORE DELETE ON role_permissions
                                FOR EACH ROW
                                BEGIN
                                    IF OLD.userRoleId = 1 THEN
                                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete role permissions for userRoleId is Admin';
                                    END IF;
                                END`;

                            const rolePermissionTrigger3 = `CREATE TRIGGER prevent_admin_update_role_permissions_trigger
                                BEFORE UPDATE ON role_permissions
                                FOR EACH ROW
                                BEGIN
                                    IF NEW.userRoleId = 1 THEN
                                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update role permissions for userRoleId is Admin';
                                    END IF;
                                END`; 

                            const rolePermissionTrigger4 = `CREATE TRIGGER create_role_permissions_trigger
                            AFTER INSERT ON modules
                            FOR EACH ROW
                            BEGIN
                                DECLARE roleId INT;
                                DECLARE done INT DEFAULT FALSE;
                                DECLARE cur CURSOR FOR SELECT id FROM user_role WHERE id != 1; -- Exclude userRoleId = 1
                                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
                            
                                OPEN cur;
                                read_loop: LOOP
                                    FETCH cur INTO roleId;
                                    IF done THEN
                                        LEAVE read_loop;
                                    END IF;
                            
                                    INSERT INTO role_permissions (userRoleId, moduleId, getMethod, postMethod, putMethod, deleteMethod)
                                    VALUES (roleId, NEW.id, 1, 0, 0, 0); -- Customize method values as needed
                                END LOOP;
                                CLOSE cur;
                            END;`;
                            const rolePermissionTrigger5 = `CREATE TRIGGER create_role_permissions_on_new_user_role_trigger
                            AFTER INSERT ON user_role
                            FOR EACH ROW
                            BEGIN
                                DECLARE moduleIdVar INT;
                                DECLARE doneModules INT DEFAULT FALSE;
                                DECLARE moduleIdCursor CURSOR FOR SELECT id FROM modules;
                                DECLARE CONTINUE HANDLER FOR NOT FOUND SET doneModules = TRUE;
                            
                                OPEN moduleIdCursor;
                                read_loop_modules: LOOP
                                    FETCH moduleIdCursor INTO moduleIdVar;
                                    IF doneModules THEN
                                        LEAVE read_loop_modules;
                                    END IF;
                            
                                    -- Check if role permissions for this userRoleId and moduleId already exist
                                    IF NOT EXISTS (
                                        SELECT 1
                                        FROM role_permissions
                                        WHERE userRoleId = NEW.id AND moduleId = moduleIdVar
                                    ) THEN
                                        -- Set method values based on userRoleId
                                        IF NEW.id = 1 THEN
                                            -- For userRoleId = 1, set all methods to 1
                                            INSERT INTO role_permissions (userRoleId, moduleId, getMethod, postMethod, putMethod, deleteMethod)
                                            VALUES (NEW.id, moduleIdVar, 1, 1, 1, 1);
                                        ELSE
                                            -- For other userRoleIds, set getMethod to 1, and other methods to 0
                                            INSERT INTO role_permissions (userRoleId, moduleId, getMethod, postMethod, putMethod, deleteMethod)
                                            VALUES (NEW.id, moduleIdVar, 1, 0, 0, 0);
                                        END IF;
                                    END IF;
                                END LOOP;
                                CLOSE moduleIdCursor;
                            END;`;

                            const triggers = [rolePermissionTrigger1, rolePermissionTrigger2, rolePermissionTrigger3, rolePermissionTrigger4,rolePermissionTrigger5];

                            // Execute each trigger query one by one
                            triggers.reduce((promiseChain, triggerQuery) => {
                                return promiseChain.then(() => {
                                    return new Promise((resolve, reject) => {
                                        connection.query(triggerQuery, (err) => {
                                            if (err) reject(err);
                                            console.log('Trigger query executed successfully');
                                            resolve();
                                        });
                                    });
                                });
                            }, Promise.resolve())
                                .then(() => {
                                    console.log('All triggers created successfully');
                                    resolve();
                                })
                                .catch((err) => {
                                    console.error('Error creating triggers:', err);
                                });

                        });
                    } else {
                        resolve();
                    }
                });
            });
        };
        const createUsersTable = () => {
            return new Promise((resolve, reject) => {
                connection.query("SHOW TABLES LIKE 'users'", (err, result) => {
                    if (err) return reject(err);

                    if (result.length === 0) {
                        const createUsersTableQuery = `
                        CREATE TABLE users (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            userName VARCHAR(255) NOT NULL,
                            email VARCHAR(255) NOT NULL,
                            password VARCHAR(255) NOT NULL,
                            userRoleId int(11) NOT NULL,
                            isActive int(11) NOT NULL DEFAULT 1,
                            createdAt timestamp NOT NULL DEFAULT current_timestamp(),
                            updatedAt timestamp NOT NULL DEFAULT current_timestamp(),
                            FOREIGN KEY (userRoleId) REFERENCES user_role(id) ON DELETE CASCADE
                        )`;

                        connection.query(createUsersTableQuery, (err) => {
                            if (err) return reject(err);
                            console.log('Users table created');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        };
        const createPasswordResetTokensTable = () => {
            return new Promise((resolve, reject) => {
                connection.query("SHOW TABLES LIKE 'password_reset_tokens'", (err, result) => {
                    if (err) return reject(err);

                    if (result.length === 0) {
                        const createPasswordResetTokensTableQuery = `
                        CREATE TABLE password_reset_tokens (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            email VARCHAR(255) NOT NULL,
                            token VARCHAR(200) NOT NULL,
                            expiresAt VARCHAR(200) NOT NULL,
                            isUsed INT(11) NOT NULL DEFAULT 0,
                            userId INT(11) NOT NULL,
                            isActive INT(11) NOT NULL DEFAULT 1,
                            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                            updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
                        )`;

                        connection.query(createPasswordResetTokensTableQuery, (err) => {
                            if (err) return reject(err);
                            console.log('Password Reset Tokens table created');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        };
        // Now execute the table creation functions sequentially
        createModulesTable()
            .then(createUserRoleTable)
            .then(createRolePermissionsTable)
            .then(createUsersTable)
            .then(createPasswordResetTokensTable)
            .then(() => {
                console.log('All tables created successfully');
            })
            .catch((err) => {
                console.error('Error creating tables:', err);
            });
    };

    static verify(req, res, next) {
        let tableName = req.params.tableName;
        const authHeader = req.headers['authorization'];
        const token = req.cookies.jwt || authHeader && authHeader.split(' ')[1];
        const contentType = req.headers['content-type'];
        if (!token) {
            console.log("Token Empty")
            if (contentType === 'application/json') {
                return res.status(401).send({ status: false, message: 'Unauthorized' });
            } else {
                return res.status(401).redirect('/user/login');
            }
        }
        // Check if token is revoked
        if (revokedTokens.includes(token)) {
            console.log("token revoked")
            if (contentType === 'application/json') {
                return res.status(401).send({ status: false, message: 'Unauthorized' });
            } else {
                return res.status(401).redirect('/user/login');
            }
        }
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                // console.log(err.message);
                if (contentType === 'application/json') {
                    return res.status(401).send({ status: false, message: 'Unauthorized' });
                } else {
                    return res.status(401).redirect('/user/login');
                }
            } else {
                var userId = decodedToken['id'];
                connection.query('SELECT * FROM users JOIN user_role ON users.userRoleId=user_role.id WHERE users.id=?', [userId], async (error, results) => {
                    if (error) {
                        console.log("error: ", error);
                        if (contentType === 'application/json') {
                            return res.status(401).send({ status: false, message: 'Unauthorized' });
                        } else {
                            return res.status(401).redirect('user/login');
                        }
                    }
                    if (!results || results.length === 0) {
                        if (contentType === 'application/json') {
                            return res.status(401).send({ status: false, message: 'Unauthorized' });
                        } else {
                            return res.status(401).redirect('user/login');
                        }
                    }
                    const user = results[0];
                    delete user.password;
                    connection.query('SELECT * FROM role_permissions JOIN user_role ON role_permissions.userRoleId = user_role.id JOIN modules ON role_permissions.moduleId = modules.id WHERE user_role.id=?', [user.userRoleId], async (error, results) => {
                        if (error) {
                            console.log("error: ", error);
                            if (contentType === 'application/json') {
                                return res.status(401).send({ status: false, message: 'Unauthorized' });
                            } else {
                                return res.status(401).redirect('/user/login');
                            }
                        }
                        user.modules = [...results];
                        const requestMethod = req.method;
                        const whitelistedUrls = process.env.WHITELISTED_URLS.split(',');
                        const whitelistedAdminUrls = process.env.WHITELISTED_ADMIN_URLS.split(',');
                        // Check if the requested URL is in the whitelist
                        if (whitelistedUrls.some(url => req.originalUrl.startsWith(url))) {
                            // Allow access without permission check
                            req.user = user;
                            req.tableName = tableName;
                            return next();
                        }
                        // Check if the requested URL is in the Admin whitelist
                        if (whitelistedAdminUrls.some(url => req.originalUrl.startsWith(url)) && user.title === 'Admin') {
                            // Allow access without permission check
                            req.user = user;
                            req.tableName = tableName;
                            return next();
                        }

                        // Filter the modules array to find the object with a matching tableName
                        let filteredModule = user.modules.find(module => module.tableName === tableName);
                        if (filteredModule == null) {
                            if (contentType === 'application/json') {
                                return res.status(403).send({ status: false, message: 'Access Denied' });
                            } else {
                                return res.status(403).redirect('/user/login');
                            }
                        }

                        if ((requestMethod == "GET" && filteredModule.getMethod) || (requestMethod == "POST" && filteredModule.postMethod) || (requestMethod == "PUT" && filteredModule.putMethod) || (requestMethod == "DELETE" && filteredModule.deleteMethod) || user.title == 'Admin') {
                            req.user = user;
                            req.tableName = tableName;
                            return next();
                        } else {
                            if (contentType === 'application/json') {
                                return res.status(403).send({ status: false, message: 'Access Denied' });
                            } else {
                                return res.status(403).redirect('/user/login');
                            }
                        }
                    })
                })
            }
        });
    };
    
    static verifyAdmin(req, res, next) {
        let tableName = req.params.tableName;
        const authHeader = req.headers['authorization'];
        const token = req.cookies.jwt || authHeader && authHeader.split(' ')[1];
        const contentType = req.headers['content-type'];
        if (!token) {
            console.log("Token Empty")
            if (contentType === 'application/json') {
                return res.status(401).send({ status: false, message: 'Unauthorized' });
            } else {
                return res.status(401).redirect('/login');
            }
        }
        // Check if token is revoked
        if (revokedTokens.includes(token)) {
            console.log("token revoked")
            if (contentType === 'application/json') {
                return res.status(401).send({ status: false, message: 'Unauthorized' });
            } else {
                return res.status(401).redirect('/login');
            }
        }
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                if (contentType === 'application/json') {
                    return res.status(401).send({ status: false, message: 'Unauthorized' });
                } else {
                    return res.status(401).redirect('/login');
                }
            } else {
                var userId = decodedToken['id'];
                connection.query('SELECT * FROM users JOIN user_role ON users.userRoleId=user_role.id WHERE users.id=?', [userId], async (error, results) => {
                    if (error) {
                        console.log("error: ", error);
                        if (contentType === 'application/json') {
                            return res.status(401).send({ status: false, message: 'Unauthorized' });
                        } else {
                            return res.status(401).redirect('/login');
                        }
                    }
                    if (!results || results.length === 0) {
                        if (contentType === 'application/json') {
                            return res.status(401).send({ status: false, message: 'Unauthorized' });
                        } else {
                            return res.status(401).redirect('/login');
                        }
                    }
                    const user = results[0];
                    delete user.password;
                    
                    if (user.title == 'Admin' && user.userRoleId==1) {
                        req.user = user;
                        req.tableName = tableName;
                        return next();
                    } else {
                        if (contentType === 'application/json') {
                            return res.status(403).send({ status: false, message: 'Access Denied' });
                        } else {
                            return res.status(403).redirect('/login');
                        }
                    }
                })
            }
        });
    };

    static info(user, callback) {
        if (user != null) {
            callback(null, { status: true, message: "User info get successfully", data: user })
        } else {
            callback({ status: false, message: "User info getting error" }, null)
        } 
    };

    static login(email, password, callback) {
        connection.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.log("error: ", error);
                // callback("Internal server error", null, null, 500);
                callback(error, null);
                return;
            }
            if (!results || results.length === 0) {
                callback(null, { status: false, message: "User Not Found" }, 401);
                return;
            }

            const user = results[0];
            const isPasswordCorrect = await bcrypt.compare(password, user.password);

            if (!isPasswordCorrect) {
                callback(null, { status: false, message: "Invalid password" }, 401);
                return;
            }

            // password is correct, proceed with generating JWT token
            const id = user.id;
            // Environment variables
            const jwtSecret = process.env.JWT_SECRET;
            const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

            // Calculate JWT expiration time
            const jwtExpiration = jwtExpiresIn ? jwtExpiresIn : '1h'; // Default to 1 hour if JWT_EXPIRES_IN is not provided

            const token = jwt.sign({ id }, jwtSecret, {
                expiresIn: jwtExpiration
            });

            // Return the token and cookie options
            callback(null, { status: true, message: "User logged in successfully", token: token },);
        });
    };

    static register(userName, email, password, userRoleId, callback) {
        connection.query('SELECT * FROM users JOIN user_role  WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.log("error: ", error);
                callback(error, null);
                return;
            }

            if (results.length > 0) {
                callback(null, { status: false, message: "Email is already registered" }, 401);
                return;
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            // Insert the user data into the database
            connection.query('INSERT INTO users SET ?', { userName, email, password: hashedPassword, userRoleId }, (error, results) => {
                if (error) {
                    console.log("error: ", error);
                    callback(error, null);
                    return;
                }
                
                callback(null, { status: true, message: "User registered successfully" ,results:results})
            });
        });
    };

    static forgotPassword(email, callback) {
        connection.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.log("error: ", error);
                callback(error, null);
                return;
            }

            if (!results || results.length === 0) {
                callback(null, { status: false, message: "User Not Found" }, 401);
                return;
            }

            const user = results[0];
            const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes from now

            // Generate a 6-digit OTP with only digits
            // const token = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
            // Generate a random number with 6 digits
            const randomNumber = Math.floor(100000 + Math.random() * 900000);

            // Convert the random number to a string
            const token = randomNumber.toString();

            connection.query('INSERT INTO password_reset_tokens (userId, email, token, expiresAt) VALUES (?, ?, ?, ?)',
                [user.id, email, token, new Date(expiryTime)],
                (error, results) => {
                    if (error) {
                        console.log("error: ", error);
                        callback("Internal server error", null, 500);
                        return;
                    }

                    sendMail(email, "password-reset", {
                        name: user.userName,
                        code: token,
                    }).then(result => {
                        if (result) {
                            callback(null, { status: true, message: "Password reset email sent. Please check your inbox.",email:email })
                        } else {
                            callback(null, { status: false, message: "Error on sent email" }, 500)
                        }
                    }).catch(error => {
                            console.error("Error sending email:", error);
                            callback(error, null);
                        });
                }
            );
        });
    };

    static resetPassword(email, token, password, confirmPassword, callback) {
        // Retrieve token details from the database
        connection.query('SELECT * FROM password_reset_tokens WHERE token = ? AND email = ?', [token, email], async (error, results) => {
            if (error) {
                console.log("error: ", error);
                // callback("Internal server error", null, null, 500);
                callback(error, null);
                return;
            }

            if (!results || results.length === 0) {
                callback(null, { status: false, message: "User Not Found" }, 401);
                return;

            }
            const userToken = results[0];
            const expiresAt = userToken.expiresAt;
            const isUsed = userToken.isUsed;
            const password_reset_tokens_id = userToken.id;

            if (new Date(expiresAt) <= new Date() || isUsed == 1) {
                callback(null, { status: false, message: "Invalid token or Expired token" }, 401);
                return;

            }

            if (password !== confirmPassword) {
                callback(null, { status: false, message: "Passwords do not match" }, 401);
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 8);

            connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userToken.userId], (error, results) => {

                if (error) {
                    console.log("error: ", error);
                    // callback("Internal server error", null, null, 500);
                    callback(error, null);
                    return;
                }
                connection.query('UPDATE password_reset_tokens SET isUsed = "1" WHERE id = ?', [password_reset_tokens_id,], (error, results) => {
                    if (error) {
                        console.log("error: ", error);
                        // callback("Internal server error", null, null, 500);
                        callback(error, null);
                        return;
                    }

                    callback(null, { status: true, message: "Password updated successfully. Please login." })
                })


            });
        });


    };

    static changePassword(user,password, newPassword, newConfirmPassword, callback) {

        connection.query('SELECT * FROM users WHERE id = ?', [user.id], async (error, results) => {
            if (error) {
                console.log("error: ", error);
                // callback("Internal server error", null, null, 500);
                callback(error, null);
                return;
            }

            if (!results || results.length === 0) {
                callback(null, { status: false, message: "User Not Found" }, 401);
                return;
            }

            if (newPassword !== newConfirmPassword) {
                callback(null, { status: false, message: "Passwords do not match" }, 401);
                return;
            }
            const user = results[0];
            const isPasswordCorrect = await bcrypt.compare(password, user.password);

            if (!isPasswordCorrect) {
                callback(null, { status: false, message: "Invalid old password" }, 401);
                return;
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            connection.query('UPDATE users SET password = ?', [hashedPassword], (error, results) => {

                if (error) {
                    console.log("error: ", error);
                    // callback("Internal server error", null, null, 500);
                    callback(error, null);
                    return;
                }
                callback(null, { status: true, message: "Password changed successful." })
            });
        });
    };


    static getRoleTitles (callback)  {
    // Example SQL query to fetch all role titles
    connection.query("SELECT * FROM users join user_role", (err, rows) => {
        if (err) {
            console.log("Error fetching role titles:", err);
            return callback(err, null);
        }
        callback(null, rows); // Pass fetched data to the callback function
    });
};

}
module.exports = USER;