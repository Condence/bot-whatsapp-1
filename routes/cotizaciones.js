const express = require('express');
const router = express.Router()
const { getAll } = require('../adapter/mysql')

var Excel = require('exceljs');
 
router.get("/all", async function (req, res) { 
  let response = await getAll(req.query.page, req.query.limit);
  res.send(response);
});
router.get("/test", async function (req, res) { 
  excelOp(); 
  
  res.send("TEST");
});

async function excelOp() {
  let workbook = new Excel.Workbook();
  workbook = await workbook.xlsx.readFile('optimaxx-plus.xlsx').then(function() {

    var worksheet = workbook.getWorksheet('OptiMaxx plus');
   
    worksheet.getCell('D7:Q7').value = "David Emanuel"; //Nombre
    worksheet.getCell('T12:X12').value = "Deducible Art. 185 (Antes Art. 218)"; //Caracteristicas
    worksheet.getCell('D12:H12').value = 1000;  // Cantidad mensual

    worksheet.getCell('AA21:AE2').value = { formula: 'IF(OR(T21="",T7=""),"",VLOOKUP((D15+T7),$E$31:$P$55,12,0))', result: undefined} ; 
     console.log(worksheet.getCell('AA21:AE2'));

     workbook.xlsx.writeFile('export2.xlsx');
   
}); 

} 

module.exports = router