const express = require('express');
const router = express.Router();
const connection = require("../config/db");
const CRUD = require('./crud')

// Service to create a dynamic model and corresponding table
class DynamicModel {
    static getModulesInformation(callBack) {
        // Generate SQL query to fetch data from the specified table
        const sql = `SELECT * FROM modules`;

        connection.query(sql, (err, result) => {
            if (err) {
                console.error('Error getting modules information:', err);
                callBack(err, null);
                return;
            }else {
                callBack(null, { status: true, message: "Data get successfully", data: result });
            }

        });
    }
    static getTableInformation(tableName, callBack) {
        // Generate SQL query to retrieve table information
        const tableSql = `SELECT * 
                          FROM information_schema.tables 
                          WHERE table_name = ?`;

        // Execute SQL query to retrieve table information
        connection.query(tableSql, [tableName], (err, tableResult) => {
            if (err) {
                console.error('Error getting table information:', err);
                callBack(err, null);
                return;
            }

            if (tableResult.length === 0) {
                console.error('Table not found:', tableName);
                callBack(new Error('Table not found'), null, 404);
                return;
            }

            const tableInfo = tableResult[0]; // Assuming there's only one table with the given name

            // Generate SQL query to retrieve columns information
            const columnsSql = `SELECT * 
                                FROM information_schema.columns 
                                WHERE table_name = ?`;

            // Execute SQL query to retrieve columns information
            connection.query(columnsSql, [tableName], (err, columnsResult) => {
                if (err) {
                    console.error('Error getting columns information:', err);
                    callBack(err, null);
                    return;
                }
                // Retrieve foreign key information
                const foreignKeySql = `SELECT
            CONSTRAINT_NAME,
            TABLE_NAME AS 'PARENT_TABLE',
            COLUMN_NAME AS 'PARENT_COLUMN',
            REFERENCED_TABLE_NAME AS 'REFERENCED_TABLE',
            REFERENCED_COLUMN_NAME AS 'REFERENCED_COLUMN'
         FROM 
            information_schema.KEY_COLUMN_USAGE
         WHERE 
            TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL`;
                connection.query(foreignKeySql, [tableName], (err, foreignKeyResult) => {
                    if (err) {
                        console.error('Error getting foreign key information:', err);
                        callBack(err, null);
                        return;
                    }
                    // Function to fetch foreign key table data asynchronously
                    function fetchForeignKeyData(foreignKeyResultData) {
                        return new Promise((resolve, reject) => {
                            CRUD.get(foreignKeyResultData.REFERENCED_TABLE, (err, data, resCode) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    if (data != null) {
                                        resolve(data.data);
                                    } else {
                                        resolve(null);
                                    }
                                }
                            });
                        });
                    }

                    var foreignKeyTableDataPromises = [];

                    // Iterate through foreign key results
                    for (let index = 0; index < foreignKeyResult.length; index++) {
                        let foreignKeyResultData = foreignKeyResult[index];
                        // Fetch foreign key table data asynchronously
                        let foreignKeyDataPromise = fetchForeignKeyData(foreignKeyResultData);
                        foreignKeyTableDataPromises.push(foreignKeyDataPromise);
                    }

                    // Wait for all foreign key table data promises to resolve
                    Promise.all(foreignKeyTableDataPromises)
                        .then((foreignKeysData) => {
                            var foreignKeyTableData = [];
                            // Combine foreign key result data with fetched foreign key table data
                            for (let index = 0; index < foreignKeyResult.length; index++) {
                                let foreignKeyResultData = foreignKeyResult[index];
                                let foreignKeyData = foreignKeysData[index];
                                foreignKeyTableData.push({ ...foreignKeyResultData, data: foreignKeyData });
                            }

                            const tableInformation = {
                                tableInfo: tableInfo,
                                columnsInfo: columnsResult,
                                foreignKeys: foreignKeyTableData
                            };
                            console.log(`Table ${tableName} information retrieved`);
                            callBack(null, { status: true, message: "Table information retrieved successfully", data: tableInformation });
                        })
                        .catch((err) => {
                            console.error('Error fetching foreign key table data:', err);
                            callBack(err, null);
                        });

                });
            });
        });
    }
    static createModel(tableName, columns, foreignKeys, callBack) {
        // Generate SQL query to create table dynamically
        let sql = `CREATE TABLE ${tableName} (`;
        // Add id column with auto-increment
        sql += `id INT AUTO_INCREMENT PRIMARY KEY, `;
        columns.forEach(column => {
            if (column.name != 'id') {
                sql += `${column.name} ${column.type}`;
                if (column.length) {
                    sql += `(${column.length})`;
                }
                // Add default value if specified
                if (column.default !== undefined) {
                    sql += ` DEFAULT '${column.default}'`;
                }
                // Add dynamic comment if specified
                if (column.comment) {
                    sql += ` COMMENT '${column.comment}'`;
                }
                // Add other SQL options if specified
                if (column.nullable) {
                    sql += ' NULL';
                } else {
                    sql += ' NOT NULL';
                }
                if (column.unique) {
                    sql += ' UNIQUE';
                }
                sql += ', ';
            }
        });
        // Add foreign key constraints if specified
        if (foreignKeys && foreignKeys.length > 0) {
            sql += `CONSTRAINT ${tableName}_fk FOREIGN KEY (${foreignKeys.map(key => key.column).join(', ')}) `;
            sql += `REFERENCES ${foreignKeys[0].referenceTable}(${foreignKeys.map(key => key.referenceColumn).join(', ')}) `;
            sql += `ON DELETE ${foreignKeys[0].onDelete || 'CASCADE'} ON UPDATE ${foreignKeys[0].onUpdate || 'CASCADE'}, `;
        }

        sql = sql.slice(0, -2); // Remove trailing comma and space
        sql += ')';

        // Execute SQL query
        connection.query(sql, (err, result) => {
            if (err) {
                console.log(`Table ${tableName} Creation Error: ${err}`);
                callBack(err, null);
            } else {
                console.log(`Table ${tableName} created`);
                connection.query(`INSERT INTO modules(tableName) VALUES ('${tableName}')`, (err, result) => {
                    if (err) {
                        console.log(`Table modules Creation Error: ${err}`);
                        callBack(err, null);
                    }else{
                        callBack(null, { status: true, message: "Table created successfully", }, 201);
                    }
                });
            }
        });
    }
    static modifyColumns(tableName, columnsToAdd, columnsToRemove, foreignKeysToAdd, foreignKeysToRemove, callBack) {
        // Generate SQL queries to add columns
        const addQueries = columnsToAdd.map(column => {
            let sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`;
            if (column.length) {
                sql += `(${column.length})`;
            }
            if (column.default !== undefined) {
                sql += ` DEFAULT '${column.default}'`;
            }
            if (column.comment) {
                sql += ` COMMENT '${column.comment}'`;
            }
            if (!column.nullable) {
                sql += ' NOT NULL';
            }
            if (column.unique) {
                sql += ' UNIQUE';
            }
            return sql;
        });

        // Generate SQL queries to add foreign keys
        const addForeignKeyQueries = foreignKeysToAdd.map(foreignKey => {
            let sql = `ALTER TABLE ${tableName} ADD CONSTRAINT ${foreignKey.name} FOREIGN KEY (${foreignKey.column}) `;
            sql += `REFERENCES ${foreignKey.referenceTable}(${foreignKey.referenceColumn}) `;
            sql += `ON DELETE ${foreignKey.onDelete || 'CASCADE'} ON UPDATE ${foreignKey.onUpdate || 'CASCADE'}`;
            return sql;
        });

        // Generate SQL queries to remove foreign keys
        const removeForeignKeyQueries = foreignKeysToRemove.map(foreignKeyName => {
            return `ALTER TABLE ${tableName} DROP FOREIGN KEY ${foreignKeyName}`;
        });

        // Execute SQL queries sequentially
        Promise.all([
            Promise.all(addQueries.map(sql => new Promise((resolve, reject) => {
                connection.query(sql, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            }))),
            Promise.all(addForeignKeyQueries.map(sql => new Promise((resolve, reject) => {
                connection.query(sql, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            }))),
            Promise.all(removeForeignKeyQueries.map(sql => new Promise((resolve, reject) => {
                connection.query(sql, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            })))
        ])
            .then(() => {
                // Generate SQL queries to remove columns
                const removeQueries = columnsToRemove.map(columnName => {
                    return `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`;
                });
                return Promise.all(removeQueries.map(sql => new Promise((resolve, reject) => {
                    connection.query(sql, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                })));
            })
            .then(() => {
                console.log(`Columns modified for table ${tableName}`);
                callBack(null, { status: true, message: "Table modified successfully", });
            })
            .catch(error => {
                console.error('Error modifying columns:', error);
                callBack(error, null);
            });
    }
    static dropModel(tableName, callBack) {
        // Generate SQL query to drop the specified table
        const sql = `DROP TABLE IF EXISTS ${tableName}`;

        // Execute SQL query
        connection.query(sql, (err, result) => {
            if (err) {
                console.error('Error dropping table:', err);
                callBack(err, null);
            } else {
                console.log(`Table ${tableName} dropped`);
                callBack(null, { status: true, message: "Table dropped successfully", });
            }
        });
    }
}

module.exports = DynamicModel;
