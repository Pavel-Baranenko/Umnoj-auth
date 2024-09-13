const config = require('config');
const smsConfig = config.get('smsRu');
const backAPIfunc = require('./functions');
const axios = require('axios');

// ======================================================== вызовы к API SMS.RU ===============================================================

/*  отправка сообщения(-й) на телефон(-ы)

    phone       строка или массив строк     номер/-а телефона в формате 7хххххххххх, > 1 номера передаются массивом строк > 10 - методом POST
    mess        строка или массив строк     сообщение получателю/-ям, если массив - то каждому номеру из phone соответствует сообщение из mess

    возвращает json со статусом отправки по каждому номеру

    https://sms.ru/api/send
*/ 
async function sendSms( phone, mess ) {
    console.log('отправка смс');
    var result = { status: null, data: {}, message: null };
    try {
        // формируем параметры вызова
        var url = `${smsConfig.apiUrl}?api_id=${smsConfig.api_token}`;
        if (Array.isArray(phone) && !Array.isArray(mess))
            url += `&to=${phone.join(',')}&msg=${mess}`;
        if (!Array.isArray(phone) && !Array.isArray(mess))
            url += `&to=${phone}&msg=${mess}`;
        if (Array.isArray(phone) && Array.isArray(mess))
            url += phone.map((el,ndx) => { return `&to[${el}]=${mess[ndx]}` });
        // отправляем запрос
        var tr = config.get('maxTry');
        while (tr > 0) {
            await axios({
                url: `${url}&json=1`,
                method: 'get'
            })
                .then(async function (response) {
                    result.status = 'OK';
                    result.data = response.data;
                    tr = -1;
                })
                .catch(async function (error) {
                    result.status = 'ERROR';
                    result.message = error;
                    tr--;
                });
            await backAPIfunc.sleep( smsConfig.apiTimeout );
        }
        if (tr === 0) 
            result.status = 'ERROR';
    } 
    catch (error) {
        console.log(error)
        result.status = 'ERROR'
        result.message = error;
    }
    return result;
}

module.exports.sendSms = sendSms;