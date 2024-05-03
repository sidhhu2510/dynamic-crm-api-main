const express = require('express');
const router = express.Router();
const CRUD = require('../../services/crud')

// List of tables for which execution should be prevented
const tablesToPreventExecution = ['modules','users', 'user_role', 'password_reset_tokens'];

// Middleware to prevent execution based on table name
const preventExecutionMiddleware = (req, res, next) => {
  const tableName = req.params.tableName;
  // Check if the requested table name is in the list of tables to prevent execution
  if (tablesToPreventExecution.includes(tableName)) {
    return res.status(403).send({ status: false, message: `Access to table '${tableName}' is forbidden.` });
  }
  // If the table name is not in the list, proceed to the next middleware
  next();
};

// Apply the middleware to all routes
router.use('/', preventExecutionMiddleware);

// Route to fetch data from a specific table
router.get('/', (req, res) => {
  try {
    console.log("Request params:", req.params);
    const tableName = req.tableName;
    CRUD.get(tableName, (err, data, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message:
            err.message || err || "Data retrieval failed"
        });
      else res.status(resCode || 200).send(data);
    })
  } catch (err) {
    console.error(`Error while getting data from ${tableName}`, err.message);
    // next(err);
    res.status(500).send({
      status: false,
      message:
        err.message || err || "Data retrieval failed"
    });
  }
});

// Route to insert data into a specific table
router.post('/', (req, res) => {
  try {
    const tableName = req.tableName;
    const data = req.body;
    CRUD.create(tableName, data, (err, data, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message:
            err.message || err || "Data insertion failed"
        });
      else res.status(resCode || 200).send(data);
    })
  } catch (err) {
    console.error(`Error while getting data from ${tableName}`, err.message);
    // next(err);
    res.status(500).send({
      status: false,
      message:
        err.message || err || "Data insertion failed"
    });
  }
});

// Route to update data in a specific table
router.put('/:id', (req, res) => {
  try {
    const tableName = req.tableName;
    const id = req.params.id;
    const data = req.body;
    CRUD.update(tableName, id, data, (err, data, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message:
            err.message || err || "Data update failed"
        });
      else res.status(resCode || 200).send(data);
    })
  } catch (err) {
    console.error(`Error while getting data from ${tableName}`, err.message);
    // next(err);
    res.status(500).send({
      status: false,
      message:
        err.message || err || "Data update failed"
    });
  }
});

// Route to delete data from a specific table
router.delete('/:id', (req, res) => {
  try {
    const tableName = req.tableName;
    const id = req.params.id;
    CRUD.delete(tableName, id, (err, data, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message:
            err.message || err || "Data deletion failed"
        });
      else res.status(resCode || 200).send(data);
    })
  } catch (err) {
    console.error(`Error while getting data from ${tableName}`, err.message);
    // next(err);
    res.status(500).send({
      status: false,
      message:
        err.message || err || "Data deletion failed"
    });
  }
});

module.exports = router;
