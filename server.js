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
    isCoinGuarded,
    parseTokenTrades,
    verifyIfRugged,
} = require('./utils/guardCoins.js');
const {
    getCoinHolders
} = require('./utils/apiFetch.js');
const {
    watchGuardedCoinsForMigration
} = require('./utils/migrationAndRefund.js');

const {
    decrypt
} = require('./utils/encrypt.js');

const {
    transferSOL
} = require('./utils/transferSol.js');

const {
    isSolanaAddress
} = require('./utils/helpers.js')


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
const ONE_MINUTE = 1000 * 60
const ONE_HOUR = 1000 * 60 * 60


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
    setInterval(() => {
        watchGuardedCoinsForMigration()
    }, ONE_HOUR * 2)

    await _Collections.GuardedCoins.updateMany({}, {
        $set: {
            hasMigrated: false
        }
    });
}


// for listing coins on front end
// the timeouts are set to avoid getting rate limited
async function PrepareCoinsForFE() {
    allGuardedCoins_byPumpGuard = await _Collections.GuardedCoins.find({}).toArray()

    let topProgress = await PumpFunFetch.getTopProgressCoins()
    if (!topProgress) {
        return null;
    }

    topProgressCoins = addLockedSolForCoins(topProgress)

    for (const coin of topProgressCoins) {
        const _tokenHolders = await getCoinHolders(coin.mint);
        coin.holders = _tokenHolders.holderCount
        await delay(250) // avoiding rate limitWhen 
    }

    setTimeout(async () => {
        const topGuarded = await PumpFunFetch.getTopGuardedCoins()
        if (!topGuarded) {
            return
        }
        topGuardedCoins = addLockedSolForCoins(topGuarded)
        for (const coin of topGuardedCoins) {
            const _tokenHolders = await getCoinHolders(coin.mint);
            coin.holders = _tokenHolders.holderCount
            await delay(250) // avoiding rate limit
        }

    }, 3000)

    setTimeout(async () => {
        const guardedTokens = await PumpFunFetch.getRecentlyGuardedCoins()
        if (!guardedTokens) {
            return
        }
        recentlyGuardedCoins = addLockedSolForCoins(guardedTokens)
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
    if (!isSolanaAddress(ca)) {
        return res.status(400).json({
            error: 'Passed address must be a solana address'
        });
    }

    try {
        await parseTokenTrades(ca);
        res.send(`Trades parsed for contract address: ${ca}`);
    } catch (error) {
        console.error('Error parsing token trades:', error);
        res.status(500).send('An error occurred while parsing token trades.');
    }
});

app.get('/verify_rugged', async (req, res) => {
    const ca = req.query.ca;

    if (!ca) {
        return res.status(400).send('Contract address (ca) is required.');
    }
    if (!isSolanaAddress(ca)) {
        return res.status(400).json({
            error: 'Passed address must be a solana address'
        });
    }
    try {
        const response = await verifyIfRugged(ca);
        res.send(`Response ${response} for contract address: ${ca}`);
    } catch (error) {
        console.error('Error parsing token trades:', error);
        res.status(500).send('An error occurred while checking rug.');
    }
})

// user request to look up a coin and check if it's guarded or not + it's data for front end
app.post('/is_coin_guarded', async (req, res) => {
    if (!req.body.ca) {
        return res.status(400).json({
            error: 'Contract address (ca) is required.'
        });
    }
    if (!isSolanaAddress(req.body.ca)) {
        return res.status(400).json({
            error: 'Passed address must be a solana address'
        });
    }
    try {
        const data = await isCoinGuarded(req.body.ca);
        res.status(200).send(data);
    } catch (error) {
        console.error('Error checking if coin is guarded:', error);
        res.status(500).json({
            error: 'An error occurred while checking if the coin is guarded.'
        });
    }
});

// user request to get lock address for a coin
app.post('/get_coin_lock_address', async (req, res) => {

    if (!req.body.ca) {
        return res.status(400).json({
            error: 'Contract address (ca) is required.'
        });
    }
    if (!isSolanaAddress(req.body.ca)) {
        return res.status(400).json({
            error: 'Passed address must be a solana address'
        });
    }
    try {
        const _addressAndData = await getCoinLockAddress(req.body.ca);
        res.status(200).send(_addressAndData);
    } catch (error) {
        console.error('Error getting coin lock address:', error);
        res.status(500).json({
            error: 'An error occurred while retrieving the coin lock address.'
        });
    }
});

// user request for update of lock address balance of a coin
app.post('/update_lock_address_balance', async (req, res) => {
    if (!req.body.ca) {
        return res.status(400).json({
            error: 'Contract address (ca) is required.'
        });
    }
    if (!isSolanaAddress(req.body.ca)) {
        return res.status(400).json({
            error: 'Passed address must be a solana address'
        });
    }
    try {
        const _balance = await updateLockAddressBalance(req.body.ca);
        res.status(200).json({
            balance: _balance
        });
    } catch (error) {
        console.error('Error updating lock address balance:', error);
        res.status(500).json({
            error: 'An error occurred while updating the lock address balance.'
        });
    }
});

// user request to get status of a coin
app.post('/get_coin_status', async (req, res) => {
    if (!req.body.ca) {
        return res.status(400).json({
            error: 'Contract address (ca) is required.'
        });
    }
    if (!isSolanaAddress(req.body.ca)) {
        return res.status(400).json({
            error: 'Passed address must be a solana address'
        });
    }
    try {
        const _theCoin = await _Collections.GuardedCoins.findOne({
            ca: req.body.ca
        });
        if (_theCoin) {
            res.status(200).send(_theCoin);
        } else {
            res.status(404).json({
                error: 'Coin not found.'
            });
        }
    } catch (error) {
        console.error('Error getting coin status:', error);
        res.status(500).json({
            error: 'An error occurred while retrieving the coin status.'
        });
    }
});

// user request to get all their refunds
app.post('/get_user_refunds', async (req, res) => {
    if (!req.body.address) {
        return res.status(400).json({
            error: 'Wallet address is required.'
        });
    }
    if (!isSolanaAddress(req.body.address)) {
        return res.status(400).json({
            error: 'Passed address must be a valid wallet address'
        });
    }

    const _res = await _Collections.UsersRefunds.findOne({
        address: req.body.address
    })
    res.send(_res)
});

// user request to be paid for one of their refunds
app.post('/pay_user_refund', async (req, res) => {
    if (!req.body.address) {
        return res.status(400).json({
            error: 'Wallet address is required.'
        });
    }
    if (!isSolanaAddress(req.body.address)) {
        return res.status(400).json({
            error: 'Passed address must be a valid wallet address'
        });
    }

    const _res = await _Collections.UsersRefunds.findOne({
        address: req.body.address
    })

    for (var i = 0; i < _res.refunds; i++) {
        if (_res.refunds[i].ca == req.body.ca) {
            if (_res.refunds[i].refundAmount && _res.refunds[i].paid == false) {

                // get the refund lock address
                const _theCoin = await _Collections.GuardedCoins.findOne({
                    address: req.body.ca
                })

                const decryptedPrivKey = decrypt(_theCoin.lockPVK)
                const keyPair = initializeKeypair(decryptedPrivKey)

                const transferResTX = await transferSOL(req.body.address, _res.refunds[i].refundAmount *
                    1e9, keyPair)

                // if transfer was successful update the user's refund state
                if (transferResTX && transferResTX.length > 30) {
                    await _Collections.UsersRefunds.updateOne({
                        address: req.body.address,
                        'refunds.ca': {
                            $eq: _CA
                        }
                    }, {
                        $addToSet: {
                            refunds: {
                                paid: true,
                                paymentTx: transferResTX,
                            },
                        },
                    });
                }
            }
        }
    }
});


// get recent rugged coins 
app.post('/get_rugged_coins', async (req, res) => {
    const _res = await _Collections.GuardedCoins.find({
        hasRuged: true,
    }).sort({
        rugDetectDate: -1
    }).limit(30).toArray()

    res.send(_res)
})

// get refund eligible users for a coin
app.post('/get_coin_refund_eligible_users', async (req, res) => {
    const _res = await _Collections.UsersRefunds.find({
        "refunds": {
            $elemMatch: {
                "ca": req.body.ca
            }
        }
    }).toArray()

    let _newRes = [];
    for (let i = 0; i < _res.length; i++) {
        _res[i].refunds.forEach(itm => {
            if (itm.ca === req.body.ca) {
                _newRes.push({
                    userAddress: _res[i].address,
                    ...itm
                });
            }
        });
    }
    res.send(_newRes)
})




// *************** HELPERS *************** \\
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// *************** HELPERS *************** \\


const server = https.createServer({
    cert: fs.readFileSync('../../../../etc/cloudflare-ssl/pumpguard.fun.pem'),
    key: fs.readFileSync('../../../../etc/cloudflare-ssl/pumpguard.fun.key'),
}, app);

server.listen(443);
