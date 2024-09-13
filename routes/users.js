const { Router } = require('express');
const router = Router();
const config = require('config');
const backAPIfunc = require ('../api/functions');
const smsAPIfunc = require ('../api/sms');
const auth = require('../middleware/auth.middleware');
const form = require('../middleware/form.middleware');
const { check, validationResult } = require('express-validator');
const cors = require('cors');


/*  создание нового пользователя

    body:
        *email                  строка                  email (является логином)
        *pass                   строка                  пароль
        *phone                  строка                  телефон
        *first_name             строка                  имя
        *last_name              строка                  фамилия
        *sex                    строка                  пол
        *city                   строка                  город проживания
        *prop_city              строка                  параметры недвижимости
        *prop_offer
        *prop_type
        *prop_state

    возвращает результат
*/
router.post(
    '/create',
    [
        cors(config.get('corsOptions')),
        form,
        check('pass').isLength({min: 8}),
        check('email').isEmail().normalizeEmail()
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/create');
        var result = { status: null, data: null, message: null };
        try {
            const errors = validationResult(req);
            if(!errors.isEmpty()) {
                return res.status(400).json({
                    status: "ERROR",
                    message: errors.array()
                });
            };
            result = await backAPIfunc.createUser( req.body, req.files );
        }
        catch (error) {
            result.status = 'ERROR';
            result.message = error;
            return res.status(400).json( result );
        }
        if (result.status === 'OK')
            return res.status(201).json( result )
        else return res.status(400).json( result );
    }
)


/*  авторизация пользователя в системе

    *email                  строка          email порльзователя (логин)
    *pass                   строка          пароль

    возвращает параметры авторизованного пользователя и токен
*/
router.post(
    '/login',
    [
        cors(config.get('corsOptions')),
        form
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/login');
        var result = { status: null, data: null, message: null };
        var credentials = { ...req.body };
        if (!credentials.email || !credentials.pass)
            result = { status: 'ERROR', data: { field: 'email, pass' }, message: 'Отсутствуют обязательные параметры (логин, пароль)' };
        result = await backAPIfunc.authorization( credentials );
        if (result.status == 'OK')
            return res.status(200).json( result )
        else return res.status(400).json( result );
    }
)


/*  отправка смс для активации пользователя
*/
router.get(
    '/sms',
    [
        cors(config.get('corsOptions')),
        auth
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/sms');
        var result = { status: null, data: null, message: null };
        if (req.user.phone && req.user.activation_code !== 'active')
            result = await smsAPIfunc.sendSms( req.user.phone, `Ваш код ${req.user.activation_code}` );
        else result = { status: 'ERROR', data: null, message: req.user.phone ? 'Активация не требуется' : 'У пользователя не задан телефон' };
        if (result.status === 'OK')
            return res.status(201).json( result )
        else return res.status(400).json( result );
    }
)


/*  активация пользователя кодом из смс

    *activation_code        число           активационный код, введенный пользователем
*/
router.get(
    '/activate',
    [
        cors(config.get('corsOptions')),
        auth
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/activate');
        var result = { status: null, data: null, message: null };
        if (!req.query.code || req.query.code === '')
            result = { status: 'ERROR', data: {}, message: 'Не введен код активации' };
        if (req.user.activation_code === 'active')
            result = { status: 'ERROR', data: req.user, message: 'Активация не требуется' };
        if (result.status != 'ERROR')
            result = await backAPIfunc.activateUser( req.user, req.query.code );
        if (result.status === 'OK')
            return res.status(201).json( result )
        else return res.status(400).json( result );
    }
)


/*  обновление информации о пользователе

    body:
        *email                  строка                  email (является логином)
        *pass                   строка                  пароль
        *phone                  строка                  телефон
        *first_name             строка                  имя
        *last_name              строка                  фамилия
        *sex                    строка                  пол
        *city                   строка                  город проживания
        *prop_city              строка                  параметры недвижимости
        *prop_offer
        *prop_type
        *prop_state

    возвращает результат
*/
router.post(
    '/update',
    [
        cors(config.get('corsOptions')),
        auth,
        form
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/update');
        const result = await backAPIfunc.updateUser( req.user, req.body, req.files );
        if (result.status == 'OK')
            return res.status(200).json( result )
        else return res.status(400).json( result );
    }
)


/*  сброс пароля
*/
router.get(
    '/reset',
    [
        cors(config.get('corsOptions')),
        form
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/reset');
        var result = { status: null, data: null, message: null };
        if (req.query.email === '')
            result = { status: 'ERROR', data: {}, message: 'Не задан email-логин' };
        else result = await backAPIfunc.resetUser( req.query.email );
        if (result.status === 'OK')
            return res.status(201).json( result )
        else return res.status(400).json( result );
    }
)


/*  получение инфо о залогиненном пользователе
*/
router.get(
    '/info',
    [
        cors(config.get('corsOptions')),
        auth
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/info');
        delete req.user.activation_code;
        delete req.user.pass;
        delete req.user.temp_pass;
        const result = { status: 'OK', data: req.user, message: '' };
        res.status(200).json( result );
    }
)


/*  удаление пользователя (сам себя)
*/
router.delete(
    '/',
    [
        cors(config.get('corsOptions')),
        auth
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/delete');
        var result = { status: null, data: null, message: null };
        result = await backAPIfunc.deleteUser( req.user.id );
        if (result.status === 'OK')
            return res.status(201).json( result )
        else return res.status(400).json( result );
    }
)


/*  получение списка пользователей (только для админов)
*/
router.post(
    '/list',
    [
        cors(config.get('corsOptions')),
        auth,
        form
    ],
    async (req, res) => {
        console.log('входящий запрос с бэкенда - user/list');
        var result = { status: null, data: null, message: null };
        if (req.user.role !== 'admin')
            result = { status: 'ERROR', data: null, message: 'Не хватает прав для выполнения запроса' }
        else result = await backAPIfunc.getList( req.body );
        if (result.status === 'OK')
            return res.status(201).json( result )
        else return res.status(400).json( result );
    }
)

module.exports = router