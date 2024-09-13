const config = require('config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const knex = require('knex');
const smsConfig = config.get('smsRu');
const smsAPIfunc = require ('../api/sms');


// ======================================================== работа с данными ===============================================================


/*  регистрация нового пользователя

    userData                 данные для регистрации пользователя, объект вида:
        fields                  список полей из form data
        files                   массив файлов из form data

    возвращает объект результат
*/
async function createUser ( userData, images ) {
    console.log('регистрация нового пользователя');
    var result = { status: null, data: {}, message: null };
    var newUser = {...userData};
    try {
        const { email, pass } = newUser;
        const hashedPassword = await bcrypt.hash( pass, 10 );
        var candidate;
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        // ищем пользователя в бд по телефону
        await conn(config.get('tables').users).where('email', email).select()
            .then(function(rows) { 
                candidate = rows;
            })
            .catch(async function(error) { 
                console.log(error);
            });
        if (candidate.length > 0) 
            result = { status: 'ERROR', data: { field: 'email' }, message: 'Пользователь с таким логином уже зарегистрирован' };
        else {
            // добавляем пользователя в бд
            newUser.activation_code = randomCode( smsConfig.activationCodeLength );
            newUser.updated = Date.now();
            newUser.pass = hashedPassword;
            newUser.temp_pass = hashedPassword;
            var avatar = [];
            var licenses = [];
            var video = [];
            if (images) 
                Object.keys(images).map(key => {
                    switch (key.split('_')[0]) {
                        case 'avatar': 
                            avatar.push(images[key].newFilename);
                            break; 
                        case 'licenses': 
                            licenses.push(images[key].newFilename);
                            break; 
                        case 'video': 
                            video.push(images[key].newFilename);
                            break;
                        default:
                    }
                });
            newUser.avatar = avatar.length > 0 ? avatar.join(',') : 'noUserImage.svg';
            newUser.licenses = licenses.length > 0 ? licenses.join(',') : 'noLicenseImage.svg';
            newUser.video = video.length > 0 ? video.join(',') : 'noVideo.svg';
            newUser.role = 'user';
            // постим пользователя в бд
            await conn(config.get('tables').users).insert(newUser,'id')
                .then(async function(rows) { 
                    result.status = 'OK';
                    newUser.id = rows[0].id;
                })
                .catch(async function(error) { 
                    console.log(error)
                    result.status = 'ERROR';
                    result.message = `Ошибка создания пользователя: ${error.sqlMessage}`;
                });
            if (result.status != 'ERROR') {
                result.data = createToken( newUser );
                result.message = `Пользователь успешно зарегистрирован`;
            }
        }
    } 
    catch (error) {
        console.log(error)
        result.status = 'ERROR'
        result.message = error;
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  авторизация пользователя в системе

    email                       строка                  email пользователя (логин)
    pass                        строка                  пароль

    возвращает объект с данными пользователя и токен
*/
async function authorization( credentials ) {
    console.log('авторизация пользователя в системе');
    var result = { status: null, data: {}, message: null };
    try {
        var users;
        const { email, pass } = credentials;
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        await conn(config.get('tables').users).where('email', email).select()
            .then(function(rows) { 
                users = rows 
            })
            .catch(async function(error) { 
                result = { status: 'ERROR', data: null, message: `Ошибка соединения с сервером MySQL: ${error.sqlMessage}` };
            });
        if (!users || users.length == 0) 
            result = { status: 'ERROR', data: { field: 'email' }, message: 'Пользователя с таким логином не существует' };
        else {
            var user = users[0];
            const isMatchMain = await bcrypt.compare( pass, user.pass );
            const isMatchTemp = await bcrypt.compare( pass, user.temp_pass );
            if (!isMatchMain && !isMatchTemp) 
                result = { status: 'ERROR', data: { field: 'pass' }, message: 'Неверный пароль' };
            else {
                if (isMatchTemp)
                    user.pass = user.temp_pass;
                if (isMatchMain)
                    user.temp_pass = user.pass;
                user.updated = Date.now();
                result.status = "OK";
                await conn(config.get('tables').users).where('id', user.id).update(user)
                    .then(async function(rows) {
                        result.status = 'OK';
                    })
                    .catch(async function(error) {
                        console.log(error)
                        result.status = 'ERROR';
                        result.message = error;
                    });
                result.data = createToken( user );
            }
        }
    } 
    catch (error) {
        console.log(error)
        result = { status: 'ERROR', data: {}, message: error };
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  активация пользователя

    user                        объект                  текущий пользователь, зарегистрированный в системе
    activation_code             число                   код, переданный для активации

    возвращает объект с параметрами пользователя
*/
async function activateUser( user, code ) {
    console.log('активация пользователя');
    var result = { status: null, data: {}, message: null };
    try {
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        // если введенный код активациии совпадает с базой
        if (user.activation_code === code) { 
            user.activation_code = 'active';
            user.updated = Date.now();
            await conn(config.get('tables').users).where('id', user.id).update(user)
                .then(async function(rows) {
                    result.status = 'OK';
                })
                .catch(async function(error) {
                    console.log(error)
                    result.status = 'ERROR';
                    result.message = error;
                });
                // формируем новый токен
                result.data = createToken( user );
                result.message = 'Пользователь успешно активирован';
        }
        else result = { status: 'ERROR', data: {}, message: 'Неверный код активации' };
    } 
    catch (error) {
        result = { status: 'ERROR', data: {}, message: error };
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  обновление данных текущего пользователя

    updateInfo                 данные для обновления пользователя, объект вида:
        fields                  список полей из form data
        files                   массив файлов из form data

    возвращает - объект - результат
*/
async function updateUser ( user, updateInfo, images ) {
    console.log('обновление данных текущего пользователя');
    var result = { status: null, data: {}, message: null };
    var updData = {...updateInfo};
    try {
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        for (var key in updData) {
            if (!['role','activation_code'].includes(key))
                user[key] = updData[key];
        } 
        var avatar = [];
        var licenses = [];
        var video = [];
        if (images) 
            Object.keys(images).map(key => {
                switch (key.split('_')[0]) {
                    case 'avatar': 
                        avatar.push(images[key].newFilename);
                        break; 
                    case 'licenses': 
                        licenses.push(images[key].newFilename);
                        break; 
                    case 'video': 
                        video.push(images[key].newFilename);
                        break;
                    default:
                }
            });
        user.avatar = avatar.length > 0 ? avatar.join(',') : 'noUserImage.svg';
        user.licenses = licenses.length > 0 ? licenses.join(',') : 'noLicenseImage.svg';
        user.video = video.length > 0 ? video.join(',') : 'noVideo.svg';
        user.updated = Date.now();
        // обновляем пользователя в бд
        await conn(config.get('tables').users).where('id', user.id).update(user)
            .then(async function(rows) { 
                result = { status: 'OK', data: user, message: 'Пользователь успешно обновлен' }; 
            })
            .catch(async function(error) { 
                result = { status: 'ERROR', data: {}, message: `Ошибка обновления пользователя: ${error.sqlMessage}` }; 
            });
        if (result.status != "ERROR") {
            result.data = createToken( user );
            result.message = 'Данные профиля успешно обновлены';
        }
    } 
    catch (error) {
        result = { status: 'ERROR', data: {}, message: error }; 
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  сброс пароля пользователя

    email           строка              email пользователя

    возвращает объект результат
*/
async function resetUser ( email ) {
    console.log('сброс пароля пользователя');
    var result = { status: null, data: {}, message: null };
    try {
        // ищем телефон пользователя в бд по email
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        await conn(config.get('tables').users).where('email', email).select()
            .then(function(rows) { 
                users = rows 
            })
            .catch(async function(error) { 
                result = { status: 'ERROR', data: null, message: `Ошибка соединения с сервером MySQL: ${error.sqlMessage}` };
            });
        if (!users || users.length == 0) 
            result = { status: 'ERROR', data: { field: 'email' }, message: 'Пользователя с таким логином не существует' };
        else {
            if (users[0].phone) {
                const newPass = randomCode( 8 );
                const hashedPassword = await bcrypt.hash( newPass, 10 );
                result = await smsAPIfunc.sendSms( users[0].phone, `Ваш временный пароль ${newPass}` );
                // обновляем пользователя в бд
                await conn(config.get('tables').users).where('email', email).update('temp_pass', hashedPassword)
                    .then(async function(rows) { 
                        result = { status: 'OK', data: {email}, message: 'Временный пароль установлен' }; 
                    })
                    .catch(async function(error) { 
                        result = { status: 'ERROR', data: {}, message: `Ошибка сброса пароля: ${error.sqlMessage}` }; 
                    });
            }
            else result = { status: 'ERROR', data: { field: 'phone' }, message: 'У пользователя не задан телефон' };
        }
    } 
    catch (error) {
        console.log(error)
        result.status = 'ERROR'
        result.message = `Ошибка сервера ${error}`;
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  удаление пользователя

    userId           число              id пользователя

    возвращает объект результат
*/
async function deleteUser ( userId ) {
    console.log('удаление пользователя');
    var result = { status: null, data: {}, message: null };
    try {
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        await conn(config.get('tables').users).where('id', userId).del()
            .then(function(rows) { 
                result.status = 'OK';
            })
            .catch(async function(error) { 
                result = { status: 'ERROR', data: null, message: `Ошибка соединения с сервером MySQL: ${error.sqlMessage}` };
            });
    } 
    catch (error) {
        console.log(error)
        result.status = 'ERROR'
        result.message = `Ошибка сервера ${error}`;
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  получение списка пользователей с заданными параметрами (только для админов)

    filter              массив строка              фильтр над списком

    возвращает массив объектов
*/
async function getList ( filter ) {
    console.log('получение списка пользователей');
    var result = { status: null, data: {}, message: null };
    try {
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        const filterArr = Object.keys(filter).map((key) => `${key} = '${filter[key]}'`);
        const whereClause = filterArr.length > 0 ? `where ${filterArr.join(' and ')}` : '';
        const sel = `select * from users ${whereClause}`;
        console.log(sel)
        await conn.raw(sel)
            .then(function(rows) { 
                result = { status: 'OK', data: rows.rows, message: `Список получен` };
            })
            .catch(async function(error) { 
                result = { status: 'ERROR', data: null, message: `Ошибка соединения с сервером MySQL: ${error.sqlMessage}` };
            });
    } 
    catch (error) {
        console.log(error)
        result.status = 'ERROR'
        result.message = `Ошибка сервера ${error}`;
    }
    finally {
        if (conn)
            conn.destroy();
    }
    return result;
}


/*  ожидание/задержка

    s                       число               задержка в микросекундах
*/
async function sleep( ms ) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/*  формирование токена авторизации

    user                    объект              пользователь, зарегистрированный в системе

    возвращает объект, содержащий параметры пользователя с токеном авторизации
*/
function createToken( user ) {
    delete user.pass;
    delete user.temp_pass;
    const token = jwt.sign(
        { user },
        config.get('jwtSecret'),
        { expiresIn: `${config.get('tokenExpire')}d` }
    );
    user.token = token;
    user.tokenExpire =  (new Date(Date.now() + config.get('tokenExpire')*24*60*60*1000)).toUTCString();
    delete user.activation_code;
    return user;
}


/*  формирование кода активации

    codeLength              число               длина кода в символах

    возвращает строку из псевдослучайных цифр длиной codeLength символов    
*/
function randomCode(codeLength) {
    let result = '';
    for (var c=0; c<codeLength; c++)
        result += Math.floor(Math.random() * 9);
    return result;
}

module.exports.createUser = createUser;
module.exports.activateUser = activateUser;
module.exports.authorization = authorization;
module.exports.updateUser = updateUser;
module.exports.resetUser = resetUser;
module.exports.deleteUser = deleteUser;
module.exports.getList = getList;
module.exports.sleep = sleep;
module.exports.createToken = createToken;
module.exports.randomCode = randomCode;