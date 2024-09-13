const express = require('express');
const config = require('config');
const PORT = config.get('port') || 80;
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({extended: true}));
app.use(express.static('static'));
app.options('*',cors(config.get('corsOptions')));
app.use('/api/v1/users',require('./routes/users'));

async function start() {
    if (process.env.NODE_ENV ==='production') {
        app.use('/static',express.static(path.join(__dirname,'/static')));
        // запуск сервера
        https
        .createServer(
            {
                key: fs.readFileSync(`/etc/letsencrypt/live/${config.get('serverUrl')}/privkey.pem`),
                cert: fs.readFileSync(`/etc/letsencrypt/live/${config.get('serverUrl')}/fullchain.pem`),
            },
            app
        )
        .listen(PORT, () => {
            console.log('production server runing on ',PORT,' port');
        });

    }
    else app.listen(PORT, () => console.log('developer server runing on ',PORT,' port'));
}

start();
