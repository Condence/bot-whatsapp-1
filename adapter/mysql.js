const {connection} = require('../config/mysql')
const DATABASE_NAME = process.env.SQL_DATABASE || 'db_test'


const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../nodesheets-370104-05a1777fbf5f.json');  
const doc = new GoogleSpreadsheet('1ykmNwd_9vxKCpwhoPVIQyze9Jg7TvBua72CS0or0ALI');
const axios = require('axios'); 
const fs = require('fs');
 

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
            if(step == 'STEP6'){
                connection.query(
                    `UPDATE ${DATABASE_NAME}.cotizacion SET ${step} = '${message}', step = '${next}', COMPLETADO = 1   WHERE usuario = '${number}' AND step != "GRACIAS"` , (error, results) => {
                        if(error) {
                           console.log(error); 
                        } 
                        resolve(results)
                    })
            } else {
                connection.query(
                    `UPDATE ${DATABASE_NAME}.cotizacion SET ${step} = '${message}', step = '${next}'  WHERE usuario = '${number}' AND step != "GRACIAS"` , (error, results) => {
                        if(error) {
                           console.log(error); 
                        } 
                        resolve(results)
                    })
            }
             
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
    id: '',
    nombre: '',
    caracteristicas: '',
    edad: '',
    aportaciones: '',
    ajuste: '',
    plazo: '' 
}


procesarCotizaciones = (   ) => new Promise( async (resolve, reject) => { 
    try {
        connection.query(
            'SELECT * FROM `cotizacion` WHERE NOT EXISTS (SELECT * FROM `cotizacion` WHERE `Procesado` = 2 LIMIT 1) AND `Procesado` = 0 AND COMPLETADO = 1 LIMIT 1;' , (error, results) => { 
            if(error) {
                console.log(error); 
            } else {
                if(results.length > 0) {
                    if(results){
                        connection.query(`UPDATE ${DATABASE_NAME}.cotizacion SET Procesado = 2 WHERE id = ${results[0].id}` , (error, result2) => {
                            if(results[0].STEP_2 == 1 || results[0].STEP_2 == 2 || results[0].STEP_2 == 3 || results[0].STEP_2 == 4){
                                switch (results[0].STEP_3_1) {
                                    case "1":
                                        cotizacion.caracteristicas = 'Fideicomiso Art. 151 (Antes Art. 176)';
                                        break;
                                    case "2":
                                        cotizacion.caracteristicas = 'Art. 93 (Antes Art. 109)';
                                        break; 
                                    case "151":
                                        cotizacion.caracteristicas = 'Fideicomiso Art. 151 (Antes Art. 176)';
                                        break;
                                    case "93":
                                        cotizacion.caracteristicas = 'Art. 93 (Antes Art. 109)';
                                        break; 
                                    default:
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
                                    default:
                                        cotizacion.ajuste = 'Si';
                                        break; 
                                }   
                            }  
                            excelOp().then((result) => { 
                                resolve(results) 
                            });
                        }) 
                    }  
                }  
            } 
        })
    } catch (error) {
        
    }
})
 
 
const excelOp = (   ) => new Promise( async (resolve, reject) => { 
    await doc.useServiceAccountAuth(creds);
 
    await doc.loadInfo();
    const worksheet = doc.sheetsByIndex[0]; 
    await worksheet.loadCells('D7:Q7');
    await worksheet.loadCells('D12:H12');
    await worksheet.loadCells('T7:W7');
    await worksheet.loadCells('D15:H15');
    await worksheet.loadCells('K12:O12');
    await worksheet.loadCells('K15:O15');
    await worksheet.loadCells('T12:X12');
    let nombre = worksheet.getCellByA1('D7:Q7').value = cotizacion.nombre;
    let edad = worksheet.getCellByA1('T7:W7').value = parseInt(cotizacion.edad);
    let aportaciones = worksheet.getCellByA1('D12:H12').value = parseInt(cotizacion.aportaciones);
    let plazo = worksheet.getCellByA1('D15:H15').value = parseInt(cotizacion.plazo);
    let periodicidad = worksheet.getCellByA1('K12:O12').value = "Mensual";
    let inflacion = worksheet.getCellByA1('K15:O15').value = cotizacion.ajuste;
    let plan = worksheet.getCellByA1('T12:X12').value = cotizacion.caracteristicas;
    
 
    await worksheet.saveUpdatedCells();

    let res = await downloadFile();
    
    if(res){
        resolve("Respolve"); 
    }
});
async function downloadFile(){ 
    const response = await axios({
        method: "get",
        url: "https://docs.google.com/spreadsheets/d/1ykmNwd_9vxKCpwhoPVIQyze9Jg7TvBua72CS0or0ALI/export?format=pdf",
        responseType: "stream"
    }).then(function (response) { 
        response.data.pipe(fs.createWriteStream("mediaSend/corrida.pdf"));
           
         
    });
    return true;
}
 
changeStatusData = ( id ) => new Promise((resolve,reejct) => { 
 
    try { 
       
    connection.query(
        `UPDATE ${DATABASE_NAME}.cotizacion SET Procesado = 3 WHERE id = '${id}'` , (error, results) => {
            if(error) {
                console.log(error); 
            } 
            resolve(results)
        })
     
         
    } catch (error) {
        
    }
})
module.exports = {getData, getReply, saveMessageMysql, CotizacionExists, createCotizacion, getNextStepData, saveMessageData, getAll, procesarCotizaciones, changeStatusData}