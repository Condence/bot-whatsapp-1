const { getData, getReply, saveMessageMysql, CotizacionExists, createCotizacion, getNextStepData, saveMessageData } = require('./mysql')
const { saveMessageJson } = require('./jsonDb')
const { getDataIa } = require('./diaglogflow')
const  stepsInitial = require('../flow/initial.json')
const  stepsReponse = require('../flow/response.json')

const get = (message) => new Promise((resolve, reject) => {
    /**
     * Si no estas usando un gesto de base de datos
     */

    if (process.env.DATABASE === 'none') {
        const { key } = stepsInitial.find(k => k.keywords.includes(message)) || { key: null }
        const response = key || null
        resolve(response)
    }
    /**
     * Si usas MYSQL
     */
    if (process.env.DATABASE === 'mysql') {
        getData(message, (dt) => {
            resolve(dt)
        });
    }

})


const reply = (step) => new Promise((resolve, reject) => {
    /**
    * Si no estas usando un gesto de base de datos
    */
    if (process.env.DATABASE === 'none') {
        let resData = { replyMessage: '', media: null, trigger: null, next: null }
        const responseFind = stepsReponse[step] || {};
        resData = {
            ...resData, 
            ...responseFind,
            replyMessage:responseFind.replyMessage.join('')
        }
        resolve(resData);
        return 
    }
    /**
     * Si usas MYSQL
     */
    if (process.env.DATABASE === 'mysql') {
        let resData = { replyMessage: '', media: null, trigger: null }
        getReply(step, (dt) => {
            resData = { ...resData, ...dt }
            resolve(resData)
        });
    }
})

const getIA = (message) => new Promise((resolve, reject) => {
    /**
     * Si usas dialogflow
     */
     if (process.env.DATABASE === 'dialogflow') {
        let resData = { replyMessage: '', media: null, trigger: null }
        getDataIa(message,(dt) => {
            resData = { ...resData, ...dt }
            resolve(resData)
        })
    }
})

/**
 * 
 * @param {*} message 
 * @param {*} date 
 * @param {*} trigger 
 * @param {*} number 
 * @returns 
 */
 const saveMessage = ( message, trigger, number, step, next, column  ) => new Promise( async (resolve, reject) => { 
    switch ( process.env.DATABASE ) {
        case 'mysql': 
           if(step == 'STEP_1'){   
               let exists = await CotizacionExists( number );   
               if(!exists){
                   resolve( await createCotizacion( message, '',  trigger, number, step ) )  
               } 
           } else {
                resolve( await saveMessageData( message, trigger, number, step, next, column ) )   
           } 
           break;
        case 'none':
            resolve( await saveMessageJson( message, trigger, number ) )
            break;
        default:
            resolve(true)
            break;
   }
})

const getNextStep = ( number  ) => new Promise( async (resolve, reject) => { 
    resolve( await getNextStepData( number ) )  
})

module.exports = { get, reply, getIA, saveMessage, getNextStep }