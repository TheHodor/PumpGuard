const express = require('express');
const http = require('http');
const https = require('https');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');

const PumpFunCalc = require('./utils/pumpFunFetch.js');
const {
    DBSetup
} = require('./utils/DB_setup.js');


// ----- setting express app ----- //
console.log(`Environment is PROD`);
const app = express();
app.use(express.json());
// app.use('/api', apiRouter);
app.use(express.static(`${__dirname}/main`));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors());
// ----- setting express app ----- //


let topCoinsOnPumpfun, _Collections, _DBs



const startServer = async () => {
    console.log("Server Started :D")
    serverStarted()
}
startServer()

async function serverStarted() {
    // setUp DB
    const _DBSetup = await DBSetup();
    _Collections = _DBSetup.Collections
    _DBs = _DBSetup.DBs

    // fetch top coins on pump.fun
    setInterval(async () => {
        topCoinsOnPumpfun = await PumpFunCalc.updateTopCoins()
    }, 1000 * 5)
}







// front end request to get the top coins
app.post('/get_top_coins', async (req, res) => {
    res.json(topCoinsOnPumpfun);
});





const server = https.createServer({
    cert: fs.readFileSync('../../etc/cloudflare-ssl/pumpguard.fun.pem'),
    key: fs.readFileSync('../../etc/cloudflare-ssl/pumpguard.fun.key'),
}, app);

server.listen(443);
