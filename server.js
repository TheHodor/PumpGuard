const express = require('express');
const rateLimit = require('express-rate-limit');
const http = require('http');
const https = require('https');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const bs58 = require("bs58");
const nacl = require("tweetnacl");
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
    hasCoinMigrated,
    takePumpGuardFee
} = require('./utils/migrationAndRefund.js');

const {
    decrypt
} = require('./utils/encrypt.js');

const {
    transferSOL,
    initializeKeypair
} = require('./utils/transferSol.js');

const {
    isSolanaAddress,
    saveImage,
    getSolBalance,
    fetchCoinData
} = require('./utils/helpers.js')


// Create a rate limiter
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 1 minutes
    max: 150, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 10 minutes',
    validate: {
        xForwardedForHeader: false
    }
})

// ----- setting express app ----- //
console.log(`Environment is PROD`);
const app = express();
app.use(express.json());
// Apply the rate limiter to all requests
app.use(limiter);
app.use(express.static(`${__dirname}/main`));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors());
// ----- setting express app ----- //


let allGuardedCoins_byPumpGuard, topProgressCoins, topGuardedCoins, recentlyGuardedCoins, guardedAndMigratedCoins,
    _Collections, _DBs
let userRefundClaimRateLimit = {}
let updateBalanceRateLimit = {}
const ONE_MINUTE = 1000 * 60
const ONE_HOUR = 1000 * 60 * 60
const PLATFORM_FEE = 0.2
const ADMIN_SECRET_KEY = "132" //"Gu@rd132"
const MIN_GUARDED_AMOUNT = 0.1 // 2.5

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


    // check migration fir guarded coins
    setInterval(async () => {
        const coinsToCheckMigration = await _Collections.GuardedCoins.find({}, {
            hasMigrated: false,
        })

        for (var i = 0; i < coinsToCheckMigration.length; i++) {
            await hasCoinMigrated(coinsToCheckMigration[i].ca)
            await delay(5000)
        }
    }, ONE_MINUTE * 15)



    // await _Collections.GuardedCoins.updateMany({}, {
    //     $set: {
    //         hasMigrated: false
    //     }
    // });

    // saveImage("5cESeFSaeDv9VWSmssbEQdV11dfkFdkZTLtqWN6apump", `https://pump.mypinata.cloud/ipfs/${extractAddress()}`);

}


// for listing coins on front end
// the timeouts are set to avoid getting rate limited
async function PrepareCoinsForFE() {
    allGuardedCoins_byPumpGuard = await _Collections.GuardedCoins.find({}).toArray()

    let topProgress = (await PumpFunFetch.getTopProgressCoins()) || topProgress
    if (!topProgress) {
        return null;
    }

    topProgressCoins = await addLockedSolForCoins_and_saveImg(topProgress)

    for (const coin of topProgressCoins) {
        const _tokenHolders = await getCoinHolders(coin.mint);
        coin.holders = _tokenHolders.holderCount
        await delay(250) // avoiding rate limitWhen 
    }

    setTimeout(async () => {
        const topGuarded = (await PumpFunFetch.getTopGuardedCoins(MIN_GUARDED_AMOUNT)) || topGuarded
        if (!topGuarded) {
            return
        }
        topGuardedCoins = await addLockedSolForCoins_and_saveImg(topGuarded)
        for (const coin of topGuardedCoins) {
            const _tokenHolders = await getCoinHolders(coin.mint);
            coin.holders = _tokenHolders.holderCount
            await delay(250) // avoiding rate limit
        }

    }, 3000)

    // setTimeout(async () => {
    //     const guardedTokens = (await PumpFunFetch.getRecentlyGuardedCoins(MIN_GUARDED_AMOUNT)) || guardedTokens
    //     if (!guardedTokens) {
    //         return
    //     }
    //     recentlyGuardedCoins = await addLockedSolForCoins_and_saveImg(guardedTokens)
    //     for (const coin of recentlyGuardedCoins) {
    //         const _tokenHolders = await getCoinHolders(coin.mint);
    //         coin.holders = _tokenHolders.holderCount
    //         await delay(250) // avoiding rate limit
    //     }

    // }, 5000)

    let __guardedAndMigratedCoins = await _Collections.GuardedCoins.find({
        hasMigrated: true
    }).sort({
        migrateDate: 1
    }).limit(20).toArray()

    guardedAndMigratedCoins = __guardedAndMigratedCoins
    for (const coin of guardedAndMigratedCoins) {
        const _data = await fetchCoinData(coin.ca)
        coin.usd_market_cap = _data.usd_market_cap
        await delay(250) // avoiding rate limit
    }


    // adding locked sol to pump.fun coins for front-end display
    async function addLockedSolForCoins_and_saveImg(pumpfunCoins) {
        for (var i = 0; i < pumpfunCoins.length; i++) {
            for (var j = 0; j < allGuardedCoins_byPumpGuard.length; j++) {

                if (pumpfunCoins[i].mint == allGuardedCoins_byPumpGuard[j].ca) {
                    pumpfunCoins[i].lockedSol = allGuardedCoins_byPumpGuard[j].balance
                }
            }
        }

        for (const coin of pumpfunCoins) {
            const res_img = await saveImage(coin.mint,
                `https://pump.mypinata.cloud/ipfs/${extractAddress(coin.image_uri)}`)
            if (!res_img) await saveImage(coin.mint, coin.image_uri)
        }

        return pumpfunCoins
    }

    setTimeout(() => {
        PrepareCoinsForFE()
    }, 1000 * 60)
}




// front end request to get the top coins
app.post('/get_top_coins', async (req, res) => {
    res.json(topProgressCoins);
});
// front end request to get the top coins - Top Guarded Coins - and Recently guarded coins
app.post('/get_all_coins', async (req, res) => {
    if (!topProgressCoins || !topGuardedCoins || !guardedAndMigratedCoins) {
        console.log("-- Tokens Data not ready yet !!")
        return res.status(403).json({
            error: 'Not ready!'
        })
    }

    return res.json({
        topCoins: topProgressCoins.slice(0, 20),
        topGuarded: topGuardedCoins.slice(0, 20),
        guardedAndMigratedCoins: guardedAndMigratedCoins
        //recentlyGuarded: recentlyGuardedCoins.slice(0, 20),
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
        const data = await isCoinGuarded(ca);
        if (!data.isGuarded) {
            return res.status(500).json({
                error: 'Token not guarded. Not parsing trades.....'
            })
        }
        await parseTokenTrades(ca);
        return res.send(`Trades parsed for contract address: ${ca}`);
    } catch (error) {
        console.error('Error parsing token trades:', error);
        return res.status(500).send('An error occurred while parsing token trades.');
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
        const data = await isCoinGuarded(ca);
        if (!data.isGuarded) {
            return res.status(500).json({
                error: 'Token not guarded. Not checking any status...'
            })
        }
        const response = await verifyIfRugged(ca);
        return res.send(`Response ${response} for contract address: ${ca}`);
    } catch (error) {
        console.error('Error parsing token trades:', error);
        return res.status(500).send('An error occurred while checking rug.');
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
        let _isGuarded = false
        let lockAddressBalance

        await hasCoinMigrated(req.body.ca)

        const _theCoinInDB = await _Collections.GuardedCoins.findOne({
            ca: req.body.ca
        })

        if (_theCoinInDB) {
            lockAddressBalance = _theCoinInDB.balance //await getSolBalance(_theCoinInDB.lockAddress)

            await _Collections.GuardedCoins.updateOne({
                ca: req.body.ca,
            }, {
                $set: {
                    balance: lockAddressBalance,
                    balance_allTimeHight: Math.max(lockAddressBalance, _theCoinInDB.balance,
                        _theCoinInDB.balance_allTimeHight),
                }
            })
    
            if (lockAddressBalance / 1e9 >= MIN_GUARDED_AMOUNT) _isGuarded = true
        } else {
            _isGuarded = false
        }

        // if (_theCoinInDB.hasMigrated) _isGuarded = true

        return res.status(200).send({
            isGuarded: _isGuarded,
            DBdata: {
                hasMigrated: _theCoinInDB?.hasMigrated,
                balance: lockAddressBalance,
                balance_allTimeHight: Math.max(lockAddressBalance, _theCoinInDB?.balance,
                    _theCoinInDB?.balance_allTimeHight),
                lockAddress: _theCoinInDB?.lockAddress
            },
            coinData: await fetchCoinData(req.body.ca)
        })

    } catch (error) {
        console.error('Error checking if coin is guarded:', error);
        return res.status(500).json({
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
        return res.status(200).send(_addressAndData);
    } catch (error) {
        console.error('Error getting coin lock address:', error);
        return res.status(500).json({
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

    // rate limit functionality 
    if (updateBalanceRateLimit[req.body.ca] && Date.now() - updateBalanceRateLimit[req.body.ca] < ONE_MINUTE * 4) {
        return res.status(400).json({
            error: 'Rate limit! try in 5'
        });
    }
    updateBalanceRateLimit[req.body.ca] = Date.now()

    try {
        // delay the balance check to make sure the deposit is recorded on chain
        setTimeout(async () => {
            const _balance = await updateLockAddressBalance(req.body.ca)
            return res.status(200).json({
                balance: _balance
            })
        }, 1000 * 8)

        // to make sure, recheck the balance again 
        setTimeout(async () => {
            await updateLockAddressBalance(req.body.ca)
        }, 1000 * 35)

    } catch (error) {
        console.error('Error updating lock address balance:', error)
        return res.status(500).json({
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

    let _hasMigrated, verifyRug, devCanClaimLockedSol
    try {
        _hasMigrated = await hasCoinMigrated(req.body.ca)
    } catch (error) {
        console.error('Error verifying rug:', error);
        return res.status(500).json({
            error: 'An error occurred while verifying coin rug.'
        });
    }

    if (!_hasMigrated) {
        try {
            verifyRug = await verifyIfRugged(req.body.ca)
        } catch (error) {
            console.error('Error verifying rug:', error);
            return res.status(500).json({
                error: 'An error occurred while verifying coin rug.'
            });
        }
    }

    try {
        let _theCoin = await _Collections.GuardedCoins.findOne({
            ca: req.body.ca
        })
        if (!_theCoin) res.status(404).json({
            error: 'Coin not found.'
        })

        _theCoin.devCanClaimLockedSol = devCanClaimLockedSol

        // if coin has migrated => dev can claim
        if (_hasMigrated || _theCoin.hasMigrated) {
            devCanClaimLockedSol = true
        }
        // if coin not migrated but 7 days has passed and COIN HAS NOT RUGGED => dev can claim
        else if (verifyRug == false && _theCoin.firstDeposit < Date.now() - ONE_HOUR * 24 * 7) {
            _theCoin.days7PassedWithNoRug = true
            devCanClaimLockedSol = true
        }

        if (!_theCoin.hasMigrated) _theCoin.hasMigrated = _hasMigrated

        _theCoin = {
            verifyRug: verifyRug,
            ..._theCoin
        }

        await _Collections.GuardedCoins.updateOne({
            ca: req.body.ca
        }, {
            $set: {
                devCanClaimLockedSol: true,
                days7PassedWithNoRug: true,
            }
        })

        return res.status(200).send({
            ca: _theCoin.ca,
            hasRuged: _theCoin.hasRuged,
            verifyRug: _theCoin.verifyRug,
            rugDetectDate: _theCoin.rugDetectDate,
            symbol: _theCoin.symbol,
            hasMigrated: _theCoin.hasMigrated,
            devRefundTX: _theCoin.devRefundTX,
            image_uri: _theCoin.image_uri,
            balance: _theCoin.balance,
        });
    } catch (error) {
        console.error('Error getting coin status:', error);
        res.status(500).json({
            error: 'An error occurred while retrieving the coin status.'
        });
    }
});

// dev request to claim their refund 
app.post('/claim_dev_refund', async (req, res) => {
    console.log("-- processing user request to get refunded for: ", req.body.ca)

    if (!req.body.ca) {
        return res.status(400).json({
            error: 'Ca to claim against must be passed'
        });
    }
    if (!isSolanaAddress(req.body.ca)) {
        return res.status(400).json({
            error: 'Passed address must be a valid contract'
        });
    }

    let _theCoin = await _Collections.GuardedCoins.findOne({
        ca: req.body.ca
    })

    if (!_theCoin) res.status(404).json({
        error: 'Coin not found.'
    })

    if (!authSigner(_theCoin.dev, req.body.signature, req.body.message)) {
        return res.status(403).json({
            error: 'Auth Failed!'
        });
    }

    if (_theCoin.devCanClaimLockedSol == false || _theCoin.days7PassedWithNoRug == false) {
        return res.status(500).json({
            error: 'Dev cannot claim sol yet..'
        })
    }

    if (_theCoin.hasRuged == true) {
        return res.status(500).json({
            error: 'Dev rugged. Not valid.'
        })
    }

    if (_theCoin.devBeenRefunded == true) {
        return res.status(500).json({
            error: 'Dev has already been refunded.'
        })
    }

    // if coin not migrated but 7 days has passed and COIN HAS NOT RUGGED => dev can claim
    if (!_theCoin.hasMigrated) {
        if (_theCoin.firstDeposit < Date.now() - ONE_HOUR * 24 * 7) {
            return res.status(500).json({
                error: 'At least 7 days since first lock deposit must be passed.'
            })
        }
    }

    const walletBalance = await getSolBalance(_theCoin.lockAddress)

    if (walletBalance < 0.01) {
        return res.status(500).json({
            error: 'Insufficient Sol balance. '
        })
    }
    // transfer dev's refund
    const decryptedPrivKey = decrypt(_theCoin.lockPVK)
    const keyPair = initializeKeypair(decryptedPrivKey)

    // Transfer cash to our wallets
    const _theCoinInDB = await _Collections.GuardedCoins.findOne({
        ca: req.body.ca
    })

    if (_theCoinInDB.platformFeeTaken !== true) {
        await takePumpGuardFee(keyPair, req.body.ca)
    } else {
        console.log("-- skipping taking platform fee as it's been already taken.")
    }

    const amountInSol = (_theCoin.balance / 1e9) - PLATFORM_FEE

    if (amountInSol <= 0.001) {
        console.error("-- Insufficient Sol balance for dev!")
        return res.status(500).json({
            error: 'Insufficient Sol balance for dev!'
        })
    }

    const transferResTX = await transferSOL(_theCoin.dev, amountInSol, keyPair)

    // if transfer was successful update the user's refund state
    if (transferResTX && transferResTX.length > 30) {
        // delay it so we make sure the tx is recorded on chain and new balance can be fetched by our api call

        // await delay(60 * 5)
        // const walletBalance = await getSolBalance(_theCoin.lockAddress)
        await _Collections.GuardedCoins.updateOne({
            ca: req.body.ca
        }, {
            $set: {
                devRefundTX: transferResTX,
                devBeenRefunded: true,
                balance: -1 // walletBalance
            }
        })
    }

    return res.send(transferResTX)
})

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
    return res.send(_res)
});


// user request to be paid for one of their refunds
app.post('/pay_user_refund', async (req, res) => {
    if (!req.body.publicKey) {
        return res.status(400).json({
            error: 'Wallet address is required.'
        });
    }
    if (!isSolanaAddress(req.body.publicKey)) {
        return res.status(400).json({
            error: 'Passed address must be a valid wallet address.'
        });
    }
    if (!authSigner(req.body.publicKey, req.body.signature, req.body.message)) {
        return res.status(400).json({
            error: 'Auth Failed!'
        });
    }

    // need a rate limit functionality for this end point to avoid users abuse with multiple requests
    if (userRefundClaimRateLimit[req.body.publicKey] && Date.now() - userRefundClaimRateLimit[req.body.publicKey] < ONE_MINUTE * 3) {
        return res.status(400).json({
            error: 'Rate limit! try in 3'
        });
    }
    userRefundClaimRateLimit[req.body.publicKey] = Date.now()

    const _res = await _Collections.UsersRefunds.findOne({
        address: req.body.publicKey
    })
    for (var i = 0; i < _res.refunds.length; i++) {
        if (_res.refunds[i].ca == req.body.ca) {
            if (_res.refunds[i].refundAmount && _res.refunds[i].paid == false) {

                // get the refund lock address
                const _theCoin = await _Collections.GuardedCoins.findOne({
                    ca: req.body.ca
                })
                const decryptedPrivKey = decrypt(_theCoin.lockPVK)
                const keyPair = initializeKeypair(decryptedPrivKey)

                const transferResTX = await transferSOL(req.body.publicKey, _res.refunds[i].refundAmount,
                    keyPair)

                // if transfer was successful update the user's refund state
                if (transferResTX && transferResTX.length > 30) {
                    await _Collections.UsersRefunds.updateOne({
                        address: req.body.publicKey,
                        'refunds.ca': req.body.ca
                    }, {
                        $set: {
                            'refunds.$.paid': true,
                            'refunds.$.paymentTx': transferResTX,
                        }
                    });
                    return res.status(200).send(`Successful refund - ${transferResTX}`)
                }
            } else {
                return res.status(403).json({
                    error: "Refund already claimed"
                })
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

    return res.send(_res)
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
    return res.send(_newRes)
})


// ****************************************** \\
// *************** ADMIN REQS *************** \\
const authMiddleware = (req, res, next) => {
    const secretKey = ADMIN_SECRET_KEY
    const providedKey = req.headers['x-admin-key']

    if (providedKey === secretKey) {
        next()
        console.log("Admin Access Granted")
    } else {
        return res.status(403).json({
            error: 'Unauthorized access'
        })
    }
}

app.post('/_processing_txes_active', async (req, res) => {
    res.json(PumpFunFetch.beingFetchedCoins())
})

// verify coin rug 
app.post('/_verify_rug', authMiddleware, async (req, res) => {
    try {
        const _res = await verifyIfRugged(req.body.ca)
        return res.json({
            isRugged: _res
        })
    } catch (error) {
        return res.status(400).json({
            error: 'error fetching'
        });
    }
})

// verify coin rug 
app.post('/_parse_ca', authMiddleware, async (req, res) => {
    try {
        const data = await isCoinGuarded(req.body.ca);
        if (!data.isGuarded) {
            return res.status(500).json({
                error: 'Token not guarded. Not parsing trades.....'
            })
        }
        const _res = await parseTokenTrades(req.body.ca, req.body.fetchDelay)
        return res.json({
            res: _res
        })
    } catch (error) {
        return res.status(400).json({
            error: 'error fetching'
        });
    }
})

// get holders of a coin from DB + their eligible refund
app.post('/_get_coin_holders', authMiddleware, async (req, res) => {
    try {
        const collection = _DBs.Holders.collection(req.body.ca)
        const collectionExists = await collection.estimatedDocumentCount() > 0

        if (collectionExists) {
            const _res = await collection.find({}).sort({
                PnL: -1
            }).toArray()

            const usersRefunds = await _Collections.UsersRefunds.find({}).toArray();
            const refundEligibleUsers = usersRefunds.flatMap(user => {
                const eligibleRefunds = user.refunds
                if (eligibleRefunds.length > 0) {
                    return {
                        address: user.address,
                        refunds: eligibleRefunds
                    };
                }
                return [];
            });

            for (var i = 0; i < _res.length; i++) {
                const userRefunds = refundEligibleUsers.find(user => user.address === _res[i].address);
                if (userRefunds) {
                    const totalRefundAmount = userRefunds.refunds.reduce((sum, refund) => sum + refund
                        .refundAmount, 0);
                    _res[i].refundAmount = totalRefundAmount;
                }
            }

            res.json(_res)
        } else {
            return res.status(400).json({
                error: 'not found'
            });
        }
    } catch (error) {
        return res.status(400).json({
            error: 'error fetching'
        });
    }
})
// ****************************************** \\


// *************** HELPERS *************** \\
function authSigner(userAddress, signature, message) {
    // Verify the signature
    const verified = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        Buffer.from(signature, 'base64'),
        bs58.decode(userAddress)
    )

    return verified ? true : false
}

function extractAddress(url) {
    const urlParts = url.split('/');
    const addressIndex = urlParts.indexOf('ipfs');

    if (addressIndex === -1) {
        return null; // Return null if the URL doesn't contain 'ipfs'
    }

    const address = urlParts[addressIndex + 1];
    return address;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// *************** HELPERS *************** \\


const server = https.createServer({
    cert: fs.readFileSync('../../../../etc/cloudflare-ssl/pumpguard.fun.pem'),
    key: fs.readFileSync('../../../../etc/cloudflare-ssl/pumpguard.fun.key'),
}, app);

server.listen(443);
