/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */
require('dotenv').config()
const fs = require('fs');
const express = require('express');
const cors = require('cors')
const qrcode = require('qrcode-terminal');
const { Client,LocalAuth  } = require('whatsapp-web.js');
const mysqlConnection = require('./config/mysql')
const { middlewareClient } = require('./middleware/client')
const { generateImage, cleanNumber, checkEnvFile, createClient, isValidNumber } = require('./controllers/handle')
const { connectionReady, connectionLost } = require('./controllers/connection')
const { saveMedia } = require('./controllers/save')
const { getMessages, responseMessages, bothResponse } = require('./controllers/flows')
const { sendMedia, sendMessage, lastTrigger, sendMessageButton, readChat } = require('./controllers/send')
const { getNextStep, saveMessage, saveMessageDataSQL, procesar, changeStatus} = require('./adapter/index')
const app = express();
const axios = require('axios');
const localtunnel = require('localtunnel');
app.use(cors())
app.use(express.json())
const MULTI_DEVICE = process.env.MULTI_DEVICE || 'true';
const server = require('http').Server(app)

const port = process.env.PORT || 8686
var client;
app.use('/', require('./routes/web'));
app.use('/cotizaciones', require('./routes/cotizaciones'));
const DIR_MEDIA = `${__dirname}/mediaSend`;
var cron = require('node-cron');
/**
 * Escuchamos cuando entre un mensaje
 */
const listenMessage = () => client.on('message', async msg => {
    const { from, body, hasMedia } = msg;

    if(!isValidNumber(from)){
        return
    }

    // Este bug lo reporto Lucas Aldeco Brescia para evitar que se publiquen estados
    if (from === 'status@broadcast') {
        return
    }
    message = body.toLowerCase();
   // console.log('BODY',message)
    const number = cleanNumber(from)
    await readChat(number, message)

    /**
     * Guardamos el archivo multimedia que envia
     */
    if (process.env.SAVE_MEDIA && hasMedia) {
        const media = await msg.downloadMedia();
        saveMedia(media);
    }

    /**
     * Si estas usando dialogflow solo manejamos una funcion todo es IA
     */

    if (process.env.DATABASE === 'dialogflow') {
        if(!message.length) return;
        const response = await bothResponse(message);
        await sendMessage(client, from, response.replyMessage);
        if (response.media) {
            sendMedia(client, from, response.media);
        }
        return
    }

    /**
    * Ver si viene de un paso anterior
    * Aqui podemos ir agregando más pasos
    * a tu gusto!
    */

    const lastStep = await lastTrigger(from) || null;
    if (lastStep) {
        const response = await responseMessages(lastStep)
        await sendMessage(client, from, response.replyMessage);
    }

    /**
     * Respondemos al primero paso si encuentra palabras clave
     */
    const step = await getMessages(message);

    if (step) {
        const response = await responseMessages(step);

        /**
         * Si quieres enviar botones
         */

        await sendMessage(client, from, response.replyMessage, response.trigger, step);

        if(response.hasOwnProperty('actions')){
            const { actions } = response;
            await sendMessageButton(client, from, null, actions);
            return
        }

        if (!response.delay && response.media) {
            sendMedia(client, from, response.media);
        }
        if (response.delay && response.media) {
            setTimeout(() => {
                sendMedia(client, from, response.media);
            }, response.delay)
        }
        return
    } else { 
        const array = [1,2,3,4];
        let next_step = await getNextStep(number); 
       
        let response = await responseMessages(next_step.step);
 
        let error = false; 
        if(next_step.step == "STEP_2") { 
            if(array.some(e=>message.includes(e))){ 
                if(message == 1){
                    await saveMessageDataSQL(message,  null, number, next_step.step, "STEP_3_1");
                } 
                if(message == 2){
                    await saveMessageDataSQL(message,  null, number, next_step.step, "STEP_3_3_1"); 
                    response = await responseMessages("STEP_3_3"); 
                    await sendMessage(client, from, response.replyMessage); 
                } 
                if(message == 3){
                    await saveMessageDataSQL(message,  null, number, next_step.step, "STEP_3_5_1"); 
                    response = await responseMessages("STEP_3_5"); 
                    await sendMessage(client, from, response.replyMessage); 
                } 
                if(message == 4){
                    await saveMessageDataSQL(message,  null, number, next_step.step, "STEP_3_4_1"); 
                    response = await responseMessages("STEP_3_4"); 
                    await sendMessage(client, from, response.replyMessage); 
                } 
            } else {
                error = true;
                const response = await responseMessages("ERROR_STEP_3_1");   
                await sendMessage(client, from, response.replyMessage); 
            }
        } else {
            if(next_step.step == "STEP_3_1"){
                if(message == 1){
                    await saveMessageDataSQL(message,  null, number, next_step.step, "STEP_3_1_1");
                    let response = await responseMessages("STEP_3_1_1");
                    await sendMessage(client, from, response.replyMessage);
                } else {
                    if(message == 2){
                        await saveMessageDataSQL(message,  null, number, next_step.step, "STEP_3_2_1");
                        let response = await responseMessages("STEP_3_2_1");
                        await sendMessage(client, from, response.replyMessage);
                    } else {
                        await saveMessageDataSQL(message,  null, number, response.column, response.next);
                    }
                     
                }
            } else { 
                const step_plazos = ["STEP_3_1_4", "STEP_3_2_3", "STEP_3_3_4", "STEP_3_4_3", "STEP_3_5_3"];  
                if(step_plazos.some(e=>next_step.step.includes(e))){ 
                    if(parseInt(message) >= 5 && parseInt(message) <= 25) {
                        let response = await responseMessages(next_step.step);  
                        await saveMessageDataSQL(message,  null, number, response.column, response.next, response.column );  
                    } else {
                        error = true;
                        const response = await responseMessages("ERROR_STEP_PLAZO");   
                        await sendMessage(client, from, response.replyMessage); 
                        console.log("ERROR");
                    }
                } else {
                    if(next_step.step != "STEP_2"){ 
                        let response = await responseMessages(next_step.step);  
                        await saveMessageDataSQL(message,  null, number, response.column, response.next, response.column );
                    } 
                } 
            }
        }

        response = await responseMessages(response.next);
        
        if(!error){ 
            if(response.option_key == "GRACIAS") { 
                await sendMessage(client, from, response.replyMessage);
                //await addCorrida(result[0]);
            }  else {
                await sendMessage(client, from, response.replyMessage);
            }
             
             
        } 
       
        
        
    }

    //Si quieres tener un mensaje por defecto
    if (process.env.DEFAULT_MESSAGE === 'true') {
        const response = await responseMessages('DEFAULT')
        await sendMessage(client, from, response.replyMessage, response.trigger);

        /**
         * Si quieres enviar botones
         */
        if(response.hasOwnProperty('actions')){
            const { actions } = response;
            await sendMessageButton(client, from, null, actions);
        }
        return
    }

    
});

async function addCorrida(file, user) {
    try {
        const response = await axios.post('https://api.investu.com.mx/api/admin/whatsapp/corrida', user)
        .then(function (response) {  
            uploadFile(response.data.data.id, file); 
        })
        .catch(function (error) {
            console.log(error);
        });
    
    } catch (error) {

    } 
}
async function addCorrida2(file, user) {
    try {
        const response = await axios.post('http://192.168.1.67:8002/api/admin/whatsapp/corrida', user)
        .then(function (response) { 
         
        })
        .catch(function (error) {
            console.log(error);
        });
    
    } catch (error) {

    } 
    
}
async function uploadFile(id, file) {
    try {
        console.log(id);
        console.log(file);
        const FormData = require('form-data'); 

        const form = new FormData();
        form.append('file', fs.createReadStream(file));
       
        
        const response = await axios.post('https://api.investu.com.mx/api/admin/whatsapp/corrida/file/'+id, form, {
            headers: { 
                "Content-Type": "multipart/form-data",
                "Content-Length": "3352"
            }})
        .then(function (response) { 
         console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        }); 
    } catch (error) {

    } 
    
}
async function Procesar(){
    let response = await responseMessages('CORRIDA');
    let responseProcesar = procesar().then((result) => {   
        if(result[0].step == 'GRACIAS'){  
            changeStatus(result[0].id).then( (result2) => { 
                setTimeout(()=>{ 
                    let name = result[0].STEP1.split(' ').join('_');
                    const file = `mediaSend/corrida_${name}.pdf`;
                    fs.renameSync("mediaSend/corrida.pdf", file);
                    sendMedia(client, result[0].usuario, `corrida_${name}.pdf`); 
                    result[0].telefono = result[0].usuario;
                     
                    addCorrida2(file, result[0]);
                  
                }, 1000);
            }); 
            setTimeout(()=>{
                
                let name = result[0].STEP1.split(' ').join('_'); 
                const file = `mediaSend/corrida_${name}.pdf`;
                addCorrida(file, result[0]);
                
                sendMessage(client, result[0].usuario, response.replyMessage); 
                Procesar();
            }, 4000);
        } 
    });  
} 

client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { headless: true }
    });
    
client.on('qr', qr => generateImage(qr, () => {
        qrcode.generate(qr, { small: true });
        
        console.log(`Ver QR http://localhost:${port}/qr`)
        socketEvents.sendQR(qr)
}))

client.on('ready', (a) => {
        connectionReady()
        listenMessage()
        const tunnel = localtunnel({ port: port, subdomain: 'investubotWhatsapplt'});
        // socketEvents.sendStatus(client)
});

client.on('auth_failure', (e) => {
        // console.log(e)
        // connectionLost()
});

client.on('authenticated', () => {
        console.log('AUTHENTICATED'); 
});

    client.initialize();



/**
 * Verificamos si tienes un gesto de db
 */

if (process.env.DATABASE === 'mysql') {
    mysqlConnection.connect()
}


server.listen(port, () => {
    console.log(`El server esta listo por el puerto ${port}`);
  
    cron.schedule('*/1 * * * *', () => { 
        console.log("Procesando....");
        Procesar();
    }); 
})
checkEnvFile();
 