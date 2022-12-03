const express = require('express');
const router = express.Router()
const { getAll } = require('../adapter/mysql')
 
 
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../nodesheets-370104-05a1777fbf5f.json');  
const doc = new GoogleSpreadsheet('1ykmNwd_9vxKCpwhoPVIQyze9Jg7TvBua72CS0or0ALI');
const axios = require('axios'); 
const fs = require('fs');

router.get("/all", async function (req, res) { 
  console.log("ENTRA");
  let response = await getAll(req.query.page, req.query.limit);
  res.send(response);
});
router.get("/test", async function (req, res) { 
  excelOp(); 
  
  res.send("TEST");
});

async function excelOp() {
  

} 

module.exports = router