const jwt = require('jsonwebtoken');
const config = require('config');
const knex = require('knex');

module.exports = async (req, res, next) => {
    if (req.method === 'OPTIONS')
        return next();
    try {
        const token = req.headers.authorization.split(' ')[1];   
        if (!token)
            return res.status(401).json({ status: "ERROR", message: 'Не заполнен параметр авторизации' });
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        req.user = decoded.user;
        var dbUser;
        var conn = knex(JSON.parse(JSON.stringify(config.get('dbConnection'))));
        await conn(config.get('tables').users).where('email', req.user.email).select()
            .then(function(rows) { 
                dbUser = rows[0];
            })
            .catch(async function(error) { 
            });
        if (conn)
            conn.destroy();
        if (dbUser.updated == decoded.user.updated)
            next()
        else return res.status(401).json({ status: "ERROR", message: `Токен авторизации недействителен` });
    } catch (error) {
        console.log(error)
        return res.status(401).json({ status: "ERROR", message: `Пользователь не авторизован ${JSON.stringify(error)}` });
    }
}