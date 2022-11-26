const express = require('express');
const router = express.Router()
const { getAll } = require('../adapter/mysql')

 
router.get("/all", async function (req, res) { 
    let response = await getAll(req.query.page, req.query.limit);
    res.send(response);
  });

module.exports = router