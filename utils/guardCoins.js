const {
    Keypair,
    PublicKey
} = require('@solana/web3.js');
const {
    RPC_helius,
    APIKEY_SHYFT,
    APIKEY_HELIUS,
    connection_helius,
} = require("../config.js");
const {
    _Collections
} = require('./DB_setup.js');
const {
    TG_alertNewGuard
} = require('./TG_bot.js');
const {
    encrypt,
    decrypt
} = require('./encrypt.js');

const { initializeKeypair, transferSol } = require('./transferSol')

const { encrypt, decrypt } = require('./encrypt.js')

const { getAllTradesPump } = require('./pumpFunFetch.js')

const { getCoinHolders } = require('./apiFetch.js')

// hardcoded values
const PLATFORM_FEE = 0.2
const LONETRADER_WALLET = '123123'
const LYMN_WALLET = '2131231'

const INSIDER = 'INSIDER'
const SNIPER = 'SNIPER'
const DEV = 'DEV'
const DEGEN = 'DEGEN'


// We create a Lock address (aka deposit address) for a coin if a users requests to lock solana for that coin.
// So by user's request this function checks if a lock address has been created for a coin or not. 
async function getCoinLockAddress(_CA) {

    // verify if the ca provided by user blongs to a pump.fun coin
    if (!isPumpFunCoin(_CA)) {
        console.log("This is not an uncomplete pump.fun coin!")
        return false
    }

    // check if a lock address for this coin exists in DB
    const _theCoinInDB = await _Collections.GuardedCoins.findOne({
        ca: _CA
    })

    if (_theCoinInDB) {
        // lock address for this coin already exists in db, so send it back to ui for user to deposit at
        return {
            lockAddress: _theCoinInDB.lockAddress,
            symbol: _theCoinInDB.symbol,
            balance: _theCoinInDB.balance,
            dev: _theCoinInDB.dev,
        }
    } else {
        // no record for this coin exists, so create a lock address for this coin and insert it in db
        const newWallet = Keypair.generate();
        const _walletAddress = await newWallet.publicKey.toString()
        const _privateKeyString = Buffer.from(newWallet.secretKey).toString('hex');
        console.log('Logging private key: ', _privateKeyString)
        const encryptedKey = encrypt(_privateKeyString)
        const _coinData = await fetchCoinData(_CA)

        const res = await _Collections.GuardedCoins.insertOne({
            ca: _CA,
            symbol: _coinData.symbol,
            dev: _coinData.creator,
            balance: 0,
            lockAddress: _walletAddress,
            lockPVK: encryptedKey,
            creationDate: Date.now(),
            firstDeposit: 0,
        })

        // successfully inserted
        if (res.acknowledged) {
            return {
                lockAddress: _walletAddress,
                symbol: _coinData.symbol,
                balance: 0,
                stauts: 'unguarded',
                dev: _coinData.creator,
            }
        }
    }
}



// when a user creates a lock address for a a short period of 15 minutes or so we automatically check the lock address every couple seconds for a new deposit.
// however for the sake of wasting less resource (for now) we also provide an option for users to request for manual deposit check
async function updateLockAddressBalance(_CA) {

    // fetch the lock address for the provided coin ca
    const _theCoinInDB = await _Collections.GuardedCoins.findOne({
        ca: _CA
    })

    if (!_theCoinInDB || !_theCoinInDB.lockAddress) {
        console.log("The coin was not found in DB")
        return
    }

    // fetch sol balance for the lock address
    const balance = await getSolBalance(_theCoinInDB.lockAddress)
    let newlyAddedBalance = 0

    let firstDepositDate = _theCoinInDB.firstDeposit
    if (_theCoinInDB.balance == 0) {
        firstDepositDate = Date.now()
    } else {
        newlyAddedBalance = balance - _theCoinInDB.balance
    }

        let firstDepositDate = _theCoinInDB.firstDeposit
        if (_theCoinInDB.balance == 0) {
            firstDepositDate = Date.now()
        }

        // Get holders now
        const allHolders = await getTokenHolders(_CA)
    if (newlyAddedBalance > 0) {
        const res = await _Collections.GuardedCoins.updateOne({
            ca: _CA
        }, {
            $set: {
                balance: balance,
                allowedSell: false,
                firstDeposit: firstDepositDate,
                holders: allHolders
            }
        })

        console.log(res)
        TG_alertNewGuard(await fetchCoinData(_CA), newlyAddedBalance / 1e9, balance / 1e9)

    }

    return balance
}


async function getTokenHolders(_CA) {
    let tokenHolders = []
    const tokenData = await getCoinHolders(_CA)
    // find signatures for all holders
    const holders = tokenData.allHolders
    const currentHoldersCount = tokenData.allHolders.length
    if (holders && currentHoldersCount > 0) {
        holders.map(async (holder) => {
            const walletData = await fetchSignatures(holder.owner)
            let tokenHolder
            // Need to figure out later on sniper
            if (walletData[1] < 25) {
                // definitely dev/insider
                tokenHolder = {
                    address: holder.owner,
                    amount: holder.amount,
                    tag: INSIDER
                }
                tokenHolders.push(tokenHolder)
            } else {
                // regular holder - still need to tag em
                tokenHolder = {
                    address: holder.owner,
                    amount: holder.amount,
                    TAG: DEGEN
                }
                tokenHolders.push(tokenHolder)
            }
        })
    }
    return tokenHolders
}


async function giveBackDevFunds(ca) {
    try {
        const _theCoinInDB = await _Collections.GuardedCoins.findOne({
            ca: ca
        })

        if (!_theCoinInDB || !_theCoinInDB.lockAddress || !_theCoinInDB.dev || !_theCoinInDB.lockPVK) {
            console.log("The coin was not found in DB")
            return
        }
        const decryptedPrivKey = decrypt(_theCoinInDB.lockPVK)
        const keyPair = initializeKeypair(decryptedPrivKey)
        // Take platform fee - 0.2 sol to start
        const balance = await getSolBalance(_theCoinInDB.lockAddress)
        const readableSolAmount = balance / 1000000000
        const amountToReturn = readableSolAmount - PLATFORM_FEE
        // return to dev
        const trnxHash = await transferSol(_theCoinInDB.dev, amountToReturn, keyPair)
        const res = await _Collections.GuardedCoins.updateOne({
            ca: _CA
        }, {
            $set: {
                status: 'refunded',
                hash: trnxHash
            }
        })
        // Transfer cash to our wallets
        console.log(res)
        await takePumpGuardFee(keyPair)
    }
    catch (e) {
        console.error('Fail during returning dev funds: ', e)
    }
}

async function takePumpGuardFee(keyPair) {
    const lonetraderHash = await transferSol(LONETRADER_WALLET, (PLATFORM_FEE / 2), keyPair)
    const lymnHash = await transferSol(LYMN_WALLET, (PLATFORM_FEE / 2), keyPair)
    console.log('Lonetrader hash: ', lonetraderHash)
    console.log('Lymn Hash: ', lymnHash)
}


// this checks and returns if a particular coin is guarded or not and it's data if it is
async function isCoinGuarded(_CA) {
    let _isGuarded = false

    const _theCoinInDB = await _Collections.GuardedCoins.findOne({
        ca: _CA
    })

    if (_theCoinInDB && _theCoinInDB.balance > 0) _isGuarded = true

    return {
        isGuarded: _isGuarded,
        DBdata: _theCoinInDB,
        coinData: await fetchCoinData(_CA)
    }
}

// verify if the ca provided by user blongs to an uncomplete pump.fun coin
async function isPumpFunCoin(_CA) {
    let isPumpFunCoin = false

    try {
        let response = await fetch(`https://frontend-api.pump.fun/coins/${_CA}`)
        let data = await response.json()

        if (data.name && data.complete == false && data.raydium_pool == null) {
            // coin exists and has not yet migrated to raydium
            isPumpFunCoin = true
        }
    } catch (error) {
        console.log("E.101: ", error)
    }

    return isPumpFunCoin
}


// fetch developer of a pump.fun coin
async function fetchCoinData(_CA) {
    let _data = {}

    try {
        let response = await fetch(`https://frontend-api.pump.fun/coins/${_CA}`)
        let data = await response.json()

        if (data.creator && data.creator.length > 39 && data.creator.length < 49) {
            _data = data
        }
    } catch (error) {
        console.log("E.102: ", error)
    }

    return _data
}


// get solana balance of an address (through shyft api)
async function getSolBalance(_address) {

    const balance = await connection_helius.getBalance(new PublicKey(_address))

    if (typeof balance == "number") {
        return balance
    }

    // shyft api response for balance chnage is faster than helius but requires a paid api

    // var myHeaders = new Headers();
    // try {
    //     const response = await fetch(
    //         "https://api.shyft.to/sol/v1/wallet/balance?network=mainnet-beta&wallet=" + _address, {
    //             method: 'GET',
    //             headers: myHeaders.append("x-api-key", APIKEY_SHYFT),
    //             redirect: 'follow'
    //         });
    //     const result = await response.text();
    //     const parsedResult = JSON.parse(result);
    //     console.log(parsedResult, _address)
    //     if (parsedResult.success) {
    //         return parseFloat(parsedResult.result.balance) * 1e9
    //     } else {
    //         throw new Error("Failed to fetch balance");
    //     }
    // } catch (error) {
    //     console.log("error", error);
    //     throw error;
    // }
}

async function parseTokenTrades(_CA) {
    const SOL_DENOM = 1000000000;
    const _theCoinInDB = await _Collections.GuardedCoins.findOne({ ca: _CA });

    // Initialize holders object
    let holders = _theCoinInDB && _theCoinInDB.holders ? _theCoinInDB.holders : {};

    // Fetch all trades related to the CA
    const allTrades = await getAllTradesPump(_CA);

    if (allTrades && allTrades.length > 0) {
        // Parse all trades starting from beginning
        for (let i = 0; i < allTrades.length; i++) {
            const trade = allTrades[i];
            const userAddress = trade.user;

            // Initialize or update holder data
            if (!holders[userAddress]) {
                holders[userAddress] = {
                    address: userAddress,
                    sol_amount: 0,
                    tokens: 0,
                    lastTradeHash: trade.signature,
                    lastTradeType: '',
                    lastTradeTime: new Date(trade.timestamp * 1000), // Convert timestamp to Date
                    tag: '',
                    hasBought: false,
                    hasSold: false
                };
            }

            // Update based on the trade type
            if (trade.is_buy) {
                holders[userAddress].tokens += trade.token_amount;
                holders[userAddress].sol_amount -= trade.sol_amount / SOL_DENOM;
                holders[userAddress].lastTradeType = 'BUY';
                holders[userAddress].hasBought = true;
            } else {
                holders[userAddress].tokens -= trade.token_amount;
                holders[userAddress].sol_amount += trade.sol_amount / SOL_DENOM;
                holders[userAddress].lastTradeType = 'SELL';
                holders[userAddress].hasSold = true;
            }

            // Update last trade time and hash
            holders[userAddress].lastTradeTime = new Date(trade.timestamp * 1000); // Convert timestamp to Date
            holders[userAddress].lastTradeHash = trade.signature;
        }

        // Apply tagging logic after processing all trades
        for (const address in holders) {
            const holder = holders[address];

            if (holder.hasSold && !holder.hasBought) {
                holder.tag = 'Transferred/Insider Wallet';
            } else if (holder.hasBought && !holder.hasSold) {
                holder.tag = 'Buyer';
            } else if (holder.hasBought && holder.hasSold) {
                holder.tag = 'Active Trader';
            }
        }

        // Store the holders data with tags back in the database
        await _Collections.GuardedCoins.updateOne(
            { ca: _CA },
            { $set: { holders: holders } },
            { upsert: true }
        );

        console.log("Holders data with tags updated and stored in the database.");
    } else {
        console.log("No new trades found for the given CA.");
    }
}







module.exports = {
    getCoinLockAddress,
    updateLockAddressBalance,
    isCoinGuarded
}


// creating a new wallet as each coin's lock address —> done
// check and confirm deposits in coins lock address —> done

// guarded coins should be always checked for migration in an interval from pump.fun api, if migration was done then refund for them should happen and dev should receive 100% of the locked amount minus the platform fee

// taking platform fee after the end of pump.fun service (this is if you agree on taking platform fee after the end of our service)

// we should have a minimum deposit amount. atm i've wrote 2.5 sol. so we should have an interval check for each coins and let's say if after 15 minute from the last deposit the lock address balance was lower than 2.5 sol all the balance should be reverted and refunded to the dev address.

// if a guarded coin did not hit raydium devs should be able to request for refund after 7 days. i think we should manually check for this one as probably bunch of devs gonna try to get users trust and them rug them with their insiders so we should check if dev or insiders have sold much or not. can't trust codes to do this automatically for now.

// we should record  top holders for guarded tokens every like 15 minutes or so and save them in db. now bitquery provides api for trades history and coin holders i need to look into it to see how useful the api could be but anyway we need to record the top trades/holders for refund.

// we should record the insiders for each coin. i'd say if the holder is a new wallet then we can consider it as insider. (at the next step we can try to figure out if the dev or insiders are farming)

// we need a telegram bot which feeds a channel with newly guarded coins

// we need a pump.fun spam bot
