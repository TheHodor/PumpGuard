const express = require('express');
const http = require('http');
// const https = require('https');
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
    isCoinGuarded,
    parseTokenTrades
} = require('./utils/guardCoins.js');
const {
    getCoinHolders
} = require('./utils/apiFetch.js');
const {
    watchGuardedCoinsForMigration
} = require('./utils/migrationAndRefund.js');


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
const migrationCheckInterval = 60 * 5 // seconds


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

    // watch all the guarded coins with the provided interval (in seconds) for migration
    watchGuardedCoinsForMigration(migrationCheckInterval)

    // await _Collections.GuardedCoins.updateMany({}, {
    //     $set: {
    //         hasMigrated: false
    //     }
    // });
}


// for listing coins on front end
// the timeouts are set to avoid getting rate limited
async function PrepareCoinsForFE() {
    allGuardedCoins_byPumpGuard = await _Collections.GuardedCoins.find({}).toArray()

    topProgressCoins = addLockedSolForCoins(await PumpFunFetch.getTopProgressCoins())
    for (const coin of topProgressCoins) {
        const _tokenHolders = await getCoinHolders(coin.mint);
        coin.holders = _tokenHolders.holderCount
        await delay(250) // avoiding rate limit
    }

    setTimeout(async () => {
        topGuardedCoins = addLockedSolForCoins(await PumpFunFetch.getTopGuardedCoins())
        for (const coin of topGuardedCoins) {
            const _tokenHolders = await getCoinHolders(coin.mint);
            coin.holders = _tokenHolders.holderCount
            await delay(250) // avoiding rate limit
        }

    }, 3000)

    setTimeout(async () => {
        recentlyGuardedCoins = addLockedSolForCoins(await PumpFunFetch.getRecentlyGuardedCoins())
        for (const coin of recentlyGuardedCoins) {
            const _tokenHolders = await getCoinHolders(coin.mint);
            coin.holders = _tokenHolders.holderCount
            await delay(250) // avoiding rate limit
        }

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
    if (!topGuardedCoins) return

    res.json({
        topCoins: topProgressCoins.slice(0, 20),
        topGuarded: topGuardedCoins.slice(0, 20),
        recentlyGuarded: recentlyGuardedCoins.slice(0, 20),
    })
});

app.get('/parse_trades', async (req, res) => {
    const ca = req.query.ca;

    if (!ca) {
        return res.status(400).send('Contract address (ca) is required.');
    }

    try {
        await parseTokenTrades(ca);
        res.send(`Trades parsed for contract address: ${ca}`);
    } catch (error) {
        console.error('Error parsing token trades:', error);
        res.status(500).send('An error occurred while parsing token trades.');
    }
});

// user request to look up a coin and check if it's guarded or not + it's data for front end
app.get('/is_coin_guarded', async (req, res) => {
    const data = await isCoinGuarded(req.query.ca)
    res.send(data)
});

// user request to get lock address for a coin
app.get('/get_coin_lock_address', async (req, res) => {
    const _addressAndData = await getCoinLockAddress(req.query.ca)
    res.send(_addressAndData)
});

// user request for update of lock address balance of a coin
app.post('/update_lock_address_balance', async (req, res) => {
    const _balance = await updateLockAddressBalance(req.body.ca)

    res.json({
        balance: _balance
    })
});



// *************** HELPERS *************** \\
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// *************** HELPERS *************** \\


const server = http.createServer({
    // cert: fs.readFileSync('../../etc/cloudflare-ssl/pumpguard.fun.pem'),
    // key: fs.readFileSync('../../etc/cloudflare-ssl/pumpguard.fun.key'),
}, app);

server.listen(8080);
