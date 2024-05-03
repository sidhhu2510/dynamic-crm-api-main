const connection = require("../config/db");
class CRUD {
    static get(tableName, callBack) {
        // Generate SQL query to fetch data from the specified table
        const sql = `SELECT * FROM ${tableName}`;

        // Execute SQL query to retrieve columns information
        const columnsSql = `SELECT * 
                            FROM information_schema.columns 
                            WHERE table_name = ?`;

        // Execute SQL query to retrieve foreign key information
        const foreignKeySql = `SELECT
                                  CONSTRAINT_NAME,
                                  TABLE_NAME AS 'Parent Table',
                                  COLUMN_NAME AS 'Parent Column',
                                  REFERENCED_TABLE_NAME AS 'Referenced Table',
                                  REFERENCED_COLUMN_NAME AS 'Referenced Column'
                               FROM 
                                  information_schema.KEY_COLUMN_USAGE
                               WHERE 
                                  TABLE_NAME = ? 
                                  AND REFERENCED_TABLE_NAME IS NOT NULL`;

        connection.query(columnsSql, [tableName], (err, columnsResult) => {
            if (err) {
                console.error('Error getting columns information:', err);
                callBack(err, null);
                return;
            }

            connection.query(foreignKeySql, [tableName], async (err, foreignKeyResult) => {
                if (err) {
                    console.error('Error getting foreign key information:', err);
                    callBack(err, null);
                    return;
                }

                // Check if there are any foreign keys
                if (foreignKeyResult.length === 0) {
                    // If no foreign keys, execute the simple query
                    connection.query(sql, (err, result) => {
                        if (err) {
                            console.error('Error fetching data:', err);
                            callBack(err, null);
                            return;
                        } else {
                            callBack(null, { status: true, message: "Data retrieved successfully", data: result });
                        }
                    });
                } else {
                    // If there are foreign keys, construct the join query
                    let joinQuery = `SELECT ${tableName}.*, `;
                    const foreignTableColumns = {};
                    const referencedColumnsPromises = [];
                    for (let i = 0; i < foreignKeyResult.length; i++) {
                        const fk = foreignKeyResult[i];
                        const referencedTable = fk["Referenced Table"];
                        if (!foreignTableColumns[referencedTable]) {
                            foreignTableColumns[referencedTable] = [];
                        }
                        const referencedColumnsSql = `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = ?`;
                        // Push the promise of the inner query into an array
                        referencedColumnsPromises.push(new Promise((resolve, reject) => {
                            connection.query(referencedColumnsSql, [referencedTable], (err, referencedColumnsResult) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    const referencedTableColumns = referencedColumnsResult.map(column => column.COLUMN_NAME);
                                    const columnAliases = {};
                                    referencedTableColumns.forEach(columnName => {
                                        columnAliases[columnName] = `${referencedTable}_${columnName}`;
                                    });
                                    foreignTableColumns[referencedTable].push(columnAliases);
                                    for (const [columnName, columnAlias] of Object.entries(columnAliases)) {
                                        joinQuery += ` ${referencedTable}.${columnName} AS ${columnAlias},`;
                                    }
                                    resolve();
                                }
                            });
                        }));
                    }

                    // Wait for all inner queries to complete
                    Promise.all(referencedColumnsPromises).then(() => {
                        // Remove the trailing comma from the last table
                        joinQuery = joinQuery.slice(0, -1);
                        joinQuery += ` FROM ${tableName}`;

                        for (let i = 0; i < foreignKeyResult.length; i++) {
                            const fk = foreignKeyResult[i];
                            joinQuery += ` LEFT JOIN ${fk["Referenced Table"]} ON ${tableName}.${fk["Parent Column"]} = ${fk["Referenced Table"]}.id`;
                        }
                        // Execute the join query
                        connection.query(joinQuery, (err, result) => {
                            if (err) {
                                console.error('Error fetching data:', err);
                                callBack(err, null);
                                return;
                            } else {
                                // Format the result with nested "other_table" key
                                const formattedResult = result.map(row => {
                                    var foreignTableData = {};
                                    for (const [table, columns] of Object.entries(foreignTableColumns)) {
                                        var tableData = {};
                                        columns.forEach(columnAliases => {
                                            for (const [columnName, columnAlias] of Object.entries(columnAliases)) {
                                                tableData[columnName] = row[columnAlias];
                                                delete row[columnAlias];
                                            }
                                        });
                                        foreignTableData[table] = [tableData];
                                    }
                                    return { ...row, table: foreignTableData };
                                });
                                callBack(null, { status: true, message: "Data retrieved successfully", data: formattedResult });
                            }
                        });
                    });
                }
            });
        });
    }
    static create(tableName, data, callBack) {
        // Generate SQL query to insert data into the specified table
        const sql = `INSERT INTO ${tableName} SET ?`;
        // Execute SQL query
        connection.query(sql, data, (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                callBack(err, null);
            } else {
                callBack(null, { status: true, message: "Data inserted successfully", data: result });
            }
        });
    }
    static update(tableName, id, newData, callBack) {
        // Generate SQL query to update data in the specified table
        const sql = `UPDATE ${tableName} SET ? WHERE id = ?`;
        // Execute SQL query
        connection.query(sql, [newData, id], (err, result) => {
            if (err) {
                console.error('Error updating data:', err);
                callBack(err, null);
            } else {
                callBack(null, { status: true, message: "Data updated successfully", data: result });
            }
        });
    }
    static delete(tableName, id, callBack) {
        // Generate SQL query to delete data from the specified table
        const sql = `DELETE FROM ${tableName} WHERE id = ?`;

        // Execute SQL query
        connection.query(sql, id, (err, result) => {
            if (err) {
                console.error('Error deleting data:', err);
                callBack(err, null);
            } else {
                if (result.affectedRows === 0) {
                    // If no rows were affected, return a 404 status code
                    callBack({ status: false, message: "Resource not found" }, null, 404);
                } else {
                    callBack(null, { status: true, message: "Data deleted successfully", data: result });
                }
            }
        });

    }
}
module.exports = CRUD;