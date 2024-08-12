const express = require('express');
const http = require('http');
const https = require('https');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');

const PumpFunFetch = require('./utils/pumpFunFetch.js');
const {
    DBSetup
} = require('./utils/DB_setup.js');
const {
    getCoinLockAddress,
    updateLockAddressBalance,
    isCoinGuarded
} = require('./utils/guardCoins.js');


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


let allGuardedCoins_byPumpGuard, topProgressCoins, topGuardedCoins, recentlyGuardedCoins, _Collections, _DBs



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
    PrepareCoinsForFE()
}


// for listing coins on front end
// the timeouts are set to avoid getting rate limited
async function PrepareCoinsForFE() {
    allGuardedCoins_byPumpGuard = await _Collections.GuardedCoins.find({}).toArray()

    topProgressCoins = addLockedSolForCoins(await PumpFunFetch.getTopProgressCoins())

    setTimeout(async () => {
        topGuardedCoins = addLockedSolForCoins(await PumpFunFetch.getTopGuardedCoins())
    }, 3000)

    setTimeout(async () => {
        recentlyGuardedCoins = addLockedSolForCoins(await PumpFunFetch.getRecentlyGuardedCoins())
    }, 5000)

    // adding locked sol to pump.fun coins for front-end display
    function addLockedSolForCoins(pumpfunCoins) {
        for (var i = 0; i < pumpfunCoins.length; i++) {
            for (var j = 0; j < allGuardedCoins_byPumpGuard.length; j++) {

                if (pumpfunCoins[i].mint == allGuardedCoins_byPumpGuard[j].ca) {
                    pumpfunCoins[i].lockedSol = allGuardedCoins_byPumpGuard[j].balance
                }
            }
        }

        return pumpfunCoins
    }

    setTimeout(() => {
        PrepareCoinsForFE()
    }, 1000 * 30)
}




// front end request to get the top coins
app.post('/get_top_coins', async (req, res) => {
    res.json(topProgressCoins);
});
// front end request to get the top coins - Top Guarded Coins - and Recently guarded coins
app.post('/get_all_coins', async (req, res) => {
    res.json({
        topCoins: topProgressCoins.slice(0, 25),
        topGuarded: topGuardedCoins.slice(0, 25),
        recentlyGuarded: recentlyGuardedCoins.slice(0, 25),
    })
});

// user request to look up a coin and check if it's guarded or not + it's data for front end
app.post('/is_coin_guarded', async (req, res) => {
    const data = await isCoinGuarded(req.body.ca)
    res.send(data)
});

// user request to get lock address for a coin
app.post('/get_coin_lock_address', async (req, res) => {
    const _addressAndData = await getCoinLockAddress(req.body.ca)
    res.send(_addressAndData)
});

// user request for update of lock address balance of a coin
app.post('/update_lock_address_balance', async (req, res) => {
    const _balance = await updateLockAddressBalance(req.body.ca)

    res.json({
        balance: _balance
    })
});



const server = https.createServer({
    cert: fs.readFileSync('../../etc/cloudflare-ssl/pumpguard.fun.pem'),
    key: fs.readFileSync('../../etc/cloudflare-ssl/pumpguard.fun.key'),
}, app);

server.listen(443);
