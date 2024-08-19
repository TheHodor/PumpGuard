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
const {
    getSolBalance
} = require('./helpers.js');

const {
    getAllTradesPump
} = require('./pumpFunFetch.js')

const {
    getCoinHolders
} = require('./apiFetch.js')

const { fetchSignatures } = require('./findInsiders.js')

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
    }
    catch (e) {
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
    const SOL_DENOM = 1000000000;
    const _theCoinInDB = await _Collections.GuardedCoins.findOne({
        ca: _CA
    });

    let holders = _theCoinInDB && _theCoinInDB.holders ? _theCoinInDB.holders : [];
    const allTrades = await getAllTradesPump(_CA);
    let snipers = []
    const sniperSlot = allTrades[0].slot
    const devWallet = _theCoinInDB.dev
    if (allTrades && allTrades.length > 0) {
        for (const trade of allTrades) {
            const userAddress = trade.user;
            const isBuy = trade.is_buy;
            // Must track insider holders in DB + Snipers + Dev only
            let holder = holders.find(h => h.address === userAddress);
            if (!holder) {
                holder = {
                    address: userAddress,
                    totalSolBought: 0,
                    totalSolSold: 0,
                    tokens: 0,
                    lastTradeHash: trade.signature,
                    tag: '',
                    hasBought: false,
                    hasSold: false
                };
                holders.push(holder);
            }

            if (isBuy) {
                // find snipers
                if(trade.user == devWallet) {
                    holder.tag = DEV
                }
                if (trade.slot == sniperSlot) {
                    holder.tag = SNIPER
                }
                holder.tokens += trade.token_amount;
                holder.totalSolBought += trade.sol_amount / SOL_DENOM;
                holder.hasBought = true;
            } else {
                if(trade.user == devWallet) {
                    holder.tag = DEV
                }
                if (trade.slot == sniperSlot) {
                    holder.tag = SNIPER
                }
                holder.tokens -= trade.token_amount;
                holder.totalSolSold += trade.sol_amount / SOL_DENOM;
                holder.hasSold = true;
            }
        }

        holders.forEach(holder => {
            if (holder.hasSold && !holder.hasBought) {
                holder.tag = TRANSFER;
            } else if (holder.hasBought && !holder.hasSold) {
                holder.tag = HOLDER;
            } else if (holder.hasBought && holder.hasSold) {
                holder.tag = DEGEN;
            }
        });
        const dev = holders.filter(holder => holder.tag == DEV)
        console.log('dev: ', dev)

        const sniperWallets = holders.filter(holder => holder.tag == SNIPER)
        console.log('Snipers: ', sniperWallets)

        const transferWallets = holders.filter(holder => holder.tag == TRANSFER)
        console.log('transfers: ', transferWallets)

        // Convert holders array to JSON string
        const data = JSON.stringify(holders, null, 2);
        var fs = require('fs');

        // Write the JSON string to a file
        fs.writeFile(`${_CA}.json`, data, 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('File has been saved.');
            }
        });
        // const res = await _Collections.GuardedCoins.updateOne({
        //     ca: _CA
        // }, {
        //     $set: {
        //         holders: holders
        //     }
        // });

        // console.log('Parsed Trades res: ', holders);
    } else {
        console.log('No trades found for CA:', _CA);
    }
}

const ca = 'FnpVAGTn1Tr4hEDzeERs8KGRV4FMjU3AdbAvU6iApump'
// const totalSupply s= 1000000000000000
// getTokenHolders(ca, totalSupply)

// parseTokenTrades(ca)

module.exports = {
    getCoinLockAddress,
    updateLockAddressBalance,
    isCoinGuarded,
    parseTokenTrades
}
