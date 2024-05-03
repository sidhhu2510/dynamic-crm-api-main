const express = require('express');
const router = express.Router();
const DynamicModel = require("../../services/dynamic-model");

// Route to create a dynamic model and corresponding table
router.post('/createModel', (req, res) => {
  try {
    // Parse request body to get model details
    const tableName = req.body.tableName;
    const columns = req.body.columns;
    const foreignKeys = req.body.foreignKeys;
    DynamicModel.createModel(tableName, columns, foreignKeys, (err, data, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message:
            err.message || err || "Data creation failed"
        });
      else res.send(data);
    });
  } catch (err) {
    console.error('Error while creating model:', err.message);
    res.status(500).send({
      status: false,
      message: err.message || "Data creation failed"
    });
  }
});

// Route to modify columns of an existing table
router.post('/modifyColumns', (req, res) => {
  try {
    const tableName = req.body.tableName;
    const columnsToAdd = req.body.columnsToAdd??[]; // Array of objects { name, type, length }
    const columnsToRemove = req.body.columnsToRemove??[]; // Array of column names to remove
    const foreignKeysToAdd = req.body.foreignKeysToAdd??[]; // Array of column names to remove
    const foreignKeysToRemove = req.body.foreignKeysToRemove??[]; // Array of column names to remove
    DynamicModel.modifyColumns(tableName, columnsToAdd, columnsToRemove, foreignKeysToAdd, foreignKeysToRemove, (err, result, resCode) => {
      if(err)
        res.status(resCode || 500).send({
        status: false,
        message: err.message || err || "Table modification failed"
      });
      else
        res.send(result);
    });
  } catch (err) {
    console.error(`Error while modifying columns for ${req.body.tableName}:`, err.message);
    res.status(500).send({
      status: false,
      message: err.message || "Table modification failed"
    });
  }
});

// Route to drop a specific table
router.delete('/dropModel/:tableName', (req, res) => {
  try {
    const tableName = req.params.tableName;
    DynamicModel.dropModel(tableName, (err, result, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message: err.message || err || "Table dropping failed"
        });
      else
        res.send(result);
    });
  } catch (err) {
    console.error(`Error while dropping table ${req.params.tableName}:`, err.message);
    res.status(500).send({
      status: false,
      message: err.message || "Table dropping failed"
    });
  }
});

// Route to get a specific table
router.get('/info/:tableName', (req, res) => {
  try {
    const tableName = req.params.tableName;
    DynamicModel.getTableInformation(tableName, (err, result, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message: err.message || err || "Table info getting failed"
        });
      else
        res.send(result);
    });
  } catch (err) {
    console.error(`Error while getting table info ${req.params.tableName}:`, err.message);
    res.status(500).send({
      status: false,
      message: err.message || "Table info getting failed"
    });
  }
});

// Route to get a list table
router.get('/info', (req, res) => {
  try {
    DynamicModel.getModulesInformation((err, result, resCode) => {
      if (err)
        res.status(resCode || 500).send({
          status: false,
          message: err.message || err || "Modules info getting failed"
        });
      else
        res.send(result);
    });
  } catch (err) {
    console.error(`Error while getting Modules info:`, err.message);
    res.status(500).send({
      status: false,
      message: err.message || "Modules info getting failed"
    });
  }
});

module.exports = router;
