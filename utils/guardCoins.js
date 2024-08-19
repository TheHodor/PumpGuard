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
    _Collections,
    _DBs
} = require('./DB_setup.js');
const {
    TG_alertNewGuard
} = require('./TG_bot.js');
const {
    encrypt,
    decrypt
} = require('./encrypt.js');
const {
    getSolBalance
} = require('./helpers.js');

const {
    getAllTradesPump
} = require('./pumpFunFetch.js')

const {
    getCoinHolders
} = require('./apiFetch.js')

const {
    fetchSignatures,
    parseAndProcessTransactions
} = require('./findInsiders.js')
var fs = require('fs');

// hardcoded values
const PLATFORM_FEE = 0.2
const LONETRADER_WALLET = '123123'
const LYMN_WALLET = '2131231'

const INSIDER = 'INSIDER'
const SNIPER = 'SNIPER'
const DEV = 'DEV'
const DEGEN = 'DEGEN'
const TRANSFER = 'TRANSFER'
const HOLDER = 'HOLDER'

const totalSupply = 1e9

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
            totalSupply: _coinData.total_supply,
            balance: 0,
            lockAddress: _walletAddress,
            lockPVK: encryptedKey,
            creationDate: Date.now(),
            firstDeposit: 0,
            hasMigrated: false
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

    if (newlyAddedBalance > 0) {
        // Get holders now
        const allHolders = await getTokenHolders(_CA, _theCoinInDB.totalSupply)
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

        console.log('updateLockAddressBalance res: ', res)
        TG_alertNewGuard(await fetchCoinData(_CA), newlyAddedBalance / 1e9, balance / 1e9)

    }

    return balance
}



async function getTokenHolders(_CA, totalSupply) {
    try {

        let tokenHolders = []
        const tokenData = await getCoinHolders(_CA)
        // find signatures for all holders
        const holders = tokenData.allHolders
        const currentHoldersCount = tokenData.allHolders.length
        if (holders && currentHoldersCount > 0) {
            const holderPromises = holders.map(async (holder) => {
                const walletData = await fetchSignatures(holder.owner);
                let tokenHolder;

                if (walletData && walletData[1] !== undefined && walletData[1] < 25) {
                    // definitely dev/insider
                    tokenHolder = {
                        address: holder.owner,
                        amount: holder.amount,
                        supplyOwned: ((holder.amount / totalSupply) * 100).toFixed(2),
                        tag: 'INSIDER',
                    };
                    return tokenHolder;
                } else {
                    // regular holder - ignore
                    return null
                }
            });

            // Wait for all promises to resolve
            tokenHolders = await Promise.all(holderPromises);
            tokenHolders = tokenHolders.filter(holder => holder !== null && holder !== undefined);

        }

        console.log('All Insider holders: ', tokenHolders);
        return tokenHolders
    } catch (e) {
        console.log('Outer error block: ', e)
    }
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

async function parseTokenTrades(_CA) {
    const _theCoin = await fetchCoinData(_CA)
    const allTrades = await getAllTradesPump(_CA)

    const sniperSlot = allTrades[0].slot
    const devWallet = _theCoin.creator
    const _tokenPriceSol = _theCoin.market_cap / 1e9

    let holders = {}

    for (var i = 0; i < allTrades.length; i++) {
        const trade = allTrades[i]

        if (!holders[allTrades[i].user]) holders[allTrades[i].user] = {
            address: allTrades[i].user,
            totalSolBought: 0,
            totalSolSold: 0,
            PnL: 0,
            tokens: 0,
            worthOfTokensSol: 0,
            TXs: [],
            tag: '',
            hasBought: false,
            hasSold: false,
            isInsider: void 0
        }

        if (allTrades[i].is_buy) {
            // find snipers
            if (trade.slot == sniperSlot) {
                holders[trade.user].tag = "SNIPER"
            }
            holders[trade.user].tokens += trade.token_amount;
            holders[trade.user].totalSolBought += trade.sol_amount / 1e9;
            holders[trade.user].hasBought = true;
        } else {
            if (trade.slot == sniperSlot) {
                holders[trade.user].tag = "SNIPER"
            }
            holders[trade.user].tokens -= trade.token_amount;
            holders[trade.user].totalSolSold += trade.sol_amount / 1e9;
            holders[trade.user].hasSold = true;
        }

        holders[trade.user].TXs.push(allTrades[i].signature)
    }

    for (const addr in holders) {
        if (holders[addr].hasSold && !holders[addr].hasBought) {
            holders[addr].tag = TRANSFER;
        } else if (holders[addr].hasBought && !holders[addr].hasSold) {
            holders[addr].tag = HOLDER;
        } else if (holders[addr].hasBought && holders[addr].hasSold) {
            holders[addr].tag = DEGEN;
        }

        if (holders[addr].address == devWallet) holders[addr].tag = "DEV"

        holders[addr].worthOfTokensSol = (holders[addr].tokens / 1e6) * _tokenPriceSol
        holders[addr].PnL = (holders[addr].totalSolSold - holders[addr].totalSolBought) + holders[addr]
            .worthOfTokensSol
    }

    // Convert the object to an array of values (objects)
    let holdersArray = Object.values(holders);

    // Sort the array based on PnL (bigger losers first)
    const sortedHolders = holdersArray.sort((a, b) => a.PnL - b.PnL);

    const maxInsiderCheck = 20
    let insidersChecked = 0
    // check if top pnl losers are insiders or not
    for (const addr in holders) {
        if (insidersChecked >= maxInsiderCheck) continue

        const walletData = await fetchSignatures(holders[addr].address);
        if (walletData && walletData[1] !== undefined && walletData[1] < 25) {
            // definitely dev/insider
            let tokenHolder = {
                address: holders[addr].address,
                amount: holders[addr].tokens / 1e6,
                supplyOwned: ((holders[addr].tokens / 1e6 / totalSupply) * 100).toFixed(2),
                tag: 'INSIDER',
            }

            holders[addr].isInsider = true
        } else {
            holders[addr].isInsider = false
        }

        insidersChecked++
    }

    console.log("-- Finished fetching data for coin: ", _CA)

    const collection = _DBs.Holders.collection(_CA)
    const collectionExists = await collection.estimatedDocumentCount() > 0
    if (!collectionExists) {
        // If the collection doesn't exist, create it
        await _DBs.Holders.createCollection(_CA)
    } else {
        // If the collection does exist, clear all the old doucments (holders) and enter new ones
        await collection.deleteMany({});
    }

    holdersArray = Object.values(holders);
    const result = await collection.insertMany(holdersArray);



    // const data = JSON.stringify(holders, null, 2);
    // // Write the JSON string to a file
    // fs.writeFile(`${_CA}.json`, data, 'utf8', (err) => {
    //     if (err) {
    //         console.error('Error writing file:', err);
    //     } else {
    //         console.log('File has been saved.');
    //     }
    // });
    // console.log(sortedHolders)
}

const ca = 'HAtsjk6h7UHeB88MGhSqwco8WuyjPuVcEB3TzLFDpump'
// const totalSupply s= 1000000000000000
// getTokenHolders(ca, totalSupply)

setTimeout(() => {
    parseTokenTrades(ca)
}, 2000)

module.exports = {
    getCoinLockAddress,
    updateLockAddressBalance,
    isCoinGuarded,
    parseTokenTrades
}
