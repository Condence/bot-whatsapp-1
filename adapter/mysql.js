const {connection} = require('../config/mysql')
const DATABASE_NAME = process.env.SQL_DATABASE || 'db_test'
var Excel = require('exceljs');

var XLSX_CALC = require('xlsx-calc');

// load your calc functions lib
var formulajs = require('@formulajs/formulajs');

getData = (message = '', callback) => connection.query(
    `SELECT * FROM ${DATABASE_NAME}.initial WHERE keywords LIKE '%${message}%'  LIMIT 1`,
    (error, results
        ) => {
    const [response] = results
    const key = response?.option_key || null
    callback(key)
});


getReply = (option_key = '', callback) => connection.query(
    `SELECT * FROM ${DATABASE_NAME}.response WHERE option_key = '${option_key}'  LIMIT 1`,
    (error, results
        ) => {
    const [response] = results; 
    const value = {
        column:response?.column || '',
        option_key:response?.option_key || '',
        replyMessage:response?.replyMessage || '',
        trigger:response?.trigger || '',
        media:response?.media || '',
        next:response?.next || ''
     
    }
    callback(value)
});

getMessages = ( number ) => new Promise((resolve,reejct) => {
    try {
        connection.query(
        `SELECT * FROM ${DATABASE_NAME}.response WHERE number = '${number}'`, (error, results) => {
            if(error) {
                console.log(error)
            }
            const [response] = results; 
            const value = {
                column:response?.column || '',
                option_key:response?.option_key || '',
                replyMessage:response?.replyMessage || '',
                trigger:response?.trigger || '',
                media:response?.media || '',
                next:response?.next || ''
            }
            resolve(value)
        })
    } catch (error) {
        
    }
})

saveMessageMysql = ( message, date, trigger, number ) => new Promise((resolve,reejct) => {
    try {
        connection.query(
        `INSERT INTO ${DATABASE_NAME}.messages  `+"( `message`, `date`, `trigger`, `number`)"+` VALUES ('${message}','${date}','${trigger}', '${number}')` , (error, results) => {
            if(error) {
                //TODO esta parte es mejor incluirla directamente en el archivo .sql template
                console.log('DEBES DE CREAR LA TABLA DE MESSAGE')
                // if( error.code === 'ER_NO_SUCH_TABLE' ){
                //     connection.query( `CREATE TABLE ${DATABASE_NAME}.messages `+"( `date` DATE NOT NULL , `message` VARCHAR(450) NOT NULL , `trigger` VARCHAR(450) NOT NULL , `number` VARCHAR(50) NOT NULL ) ENGINE = InnoDB", async (error, results) => {
                //         setTimeout( async () => {
                //             return resolve( await this.saveMessageMysql( message, date, trigger, number ) )
                //         }, 150)
                //     })
                // }
            } 
            resolve(results)
        })
    } catch (error) {
        
    }
})

createCotizacion = ( message, date, trigger, number, step) => new Promise((resolve,reejct) => { 
    try { 
        connection.query(
        `INSERT INTO cotizacion  `+"(`usuario`, `step`)"+` VALUES ('${number}', 'STEP_2')` , (error, results) => {
            if(error) {  
                console.log('DEBES DE CREAR LA TABLA DE MESSAGE') 
            } 
            resolve(results)
        })
    } catch (error) {
        
    }
})

CotizacionExists = (number) => {
    return new Promise((resolve) => {
      connection.query(
        'SELECT usuario FROM cotizacion WHERE usuario = ? AND step != "GRACIAS" LIMIT 1',
        [number],
        (error, result) => {
          if (error) return reject(error);
  
          if (result && result[0]) { 
            return resolve(true);
          }
  
          return resolve(false);
        });
    });
};

getNextStepData = (number) => {
    return new Promise((resolve) => {
      connection.query(
        'SELECT * FROM cotizacion WHERE usuario = ? AND step != "GRACIAS" LIMIT 1',
        [number],
        (error, result) => {
          if (error) return reject(error);
  
          if (result && result[0]) {  
            return resolve(result[0]);
          }
  
          return resolve(false);
        });
    });
};


saveMessageData = ( message, trigger, number, step = null, next ) => new Promise((resolve,reejct) => { 
    try { 
        if(step){
            connection.query(
                `UPDATE ${DATABASE_NAME}.cotizacion SET ${step} = '${message}', step = '${next}'  WHERE usuario = '${number}' AND step != "GRACIAS"` , (error, results) => {
                    if(error) {
                       console.log(error); 
                    } 
                    resolve(results)
                })
        } else {
            resolve()
        }
         
    } catch (error) {
        
    }
})

getAll = (page, limit) => { 
    off = (page - 1)*limit ;
    row = limit;
    let total = 0;
    return new Promise((resolve) => {
        connection.query(
            `SELECT COUNT(*) as total FROM cotizacion` , (error, results) => {
                 
                total = results[0].total;
        })

      connection.query(
        'SELECT * FROM cotizacion LIMIT '+off+', '+row+'', 
        (error, result) => { 
            if (error) return reject(error);
  
            if (result) {  
                let data = {
                    rows: result,
                    total: total
                }
                data.rows = data.rows.map(object => { 
                    let tipo; 
                    switch (object.STEP_2) {
                        case '1':
                            tipo = "Planear tu retiro";
                            break;
                        case '2':
                            tipo = "Hacer un esquema de ahorro para la educación de tus hijos";
                            break; 
                        case '3':
                            tipo = "Ahorrar para una hipoteca, comprar el coche de tus sueños u otros";
                            break; 
                        case '4':
                            tipo = "Tener independencia económica en cualquier momento ";
                            break; 
                        default:
                            tipo = 'NA';
                            break;
                    }
                    return {...object, tipo: tipo};
                });
                resolve(data); 
            }
  
          return resolve(false);
        });
    }); 
};

let cotizacion = {
    nombre: '',
    caracteristicas: '',
    edad: '',
    aportaciones: '',
    ajuste: '',
    plazo: '' 
}
procesarCotizaciones = () => new Promise((resolve,reejct) => {
    try { 
      
        connection.query(
            'SELECT * FROM cotizacion WHERE Procesado = 0 LIMIT 1' , (error, results) => {
           
                if(error) {
                    console.log(error); 
                } else {
                    if(results[0].STEP_2 == 1){
                        switch (results[0].STEP_3_1) {
                            case "1":
                                cotizacion.caracteristicas = 'Fideicomiso Art. 151 (Antes Art. 176)';
                              break;
                            case "2":
                                cotizacion.caracteristicas = 'Art. 93 (Antes Art. 109)';
                                break; 
                        } 
                        cotizacion.nombre = results[0].STEP1;
                        cotizacion.edad = results[0].STEP3;
                        cotizacion.plazo = results[0].STEP4;
                        cotizacion.aportaciones = results[0].STEP5; 
                        switch (results[0].STEP6) {
                            case "1":
                                cotizacion.ajuste = 'Si';
                              break;
                            case "2":
                                cotizacion.ajuste = 'No';
                                break; 
                        }   
                    } 
                    excelOp();
                }
                resolve(results)
        })
      
         
    } catch (error) {
        
    }
})

async function excelOp() {
    console.log(cotizacion);
    let workbook = new Excel.Workbook();
    workbook = await workbook.xlsx.readFile('./optimaxx-plus.xlsx').then(function() {
  
      var worksheet = workbook.getWorksheet('OptiMaxx plus');
      worksheet.getCell('D7:Q7').value = cotizacion.nombre; //Nombre
      worksheet.getCell('T7:W7').value = cotizacion.edad; //Edad
      worksheet.getCell('T12:X12').value = cotizacion.caracteristicas; //Caracteristicas
      worksheet.getCell('D12:H12').value = parseInt(cotizacion.aportaciones);  // Cantidad mensual  
      worksheet.getCell('D15:H15').value = parseInt(cotizacion.plazo);  //  Plazo
      worksheet.getCell('K15:O15').value = cotizacion.ajuste;  // Ajuste inflacion 
 

 
       workbook.xlsx.writeFile('export2.xlsx');
     
  });
}

module.exports = {getData, getReply, saveMessageMysql, CotizacionExists, createCotizacion, getNextStepData, saveMessageData, getAll, procesarCotizaciones}