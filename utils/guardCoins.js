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
    getSolBalance,
    getTokenBalance
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

const {
    initializeKeypair,
    transferSOL
} = require('./transferSol.js')

const {
    takePumpGuardFee
} = require('./migrationAndRefund.js')

// hardcoded values
const PLATFORM_FEE = 0.2

const SUPPLY_RUG_THRESHOLD = 10
const MAX_WALLET_REFUND = 25
const MIN_DEPOSIT_SOL = 0.1
const TOTALSUPPLY = 1e9
const DELAYED_BLOCK_SNIPERS_THRESHOLD = 5

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
            balance_allTimeHight: 0,
            lockAddress: _walletAddress,
            lockPVK: encryptedKey,
            creationDate: Date.now(),
            firstDeposit: 0,
            hasMigrated: false,
            hasRuged: false,
            rugDetectDate: null,
            platformFeeTaken: false,
            devBeenRefunded: false,
            holdersRefunded: false,
            devCanClaimLockedSol: false,
            days7PassedWithNoRug: false,
            refundProcessed: false,
            devRefundTX: "",
        })

        // successfully inserted
        if (res.acknowledged) {
            return {
                lockAddress: _walletAddress,
                symbol: _coinData.symbol,
                balance: 0,
                status: 'unguarded',
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
    let newlyAddedBalance = balance

    let firstDepositDate = _theCoinInDB.firstDeposit
    if (_theCoinInDB.balance == 0) {
        firstDepositDate = Date.now()
    } else {
        newlyAddedBalance = balance - _theCoinInDB.balance
    }

    if (balance / 1e9 >= MIN_DEPOSIT_SOL) {
        if (newlyAddedBalance > 0) {
            // Get holders now
            // const allHolders = await getTokenHolders(_CA, _theCoinInDB.totalSupply)
            const res = await _Collections.GuardedCoins.updateOne({
                ca: _CA
            }, {
                $set: {
                    balance: balance,
                    balance_allTimeHight: Math.max(balance, _theCoinInDB.balance),
                    allowedSell: false,
                    firstDeposit: firstDepositDate,
                }
            })

            if (res.matchedCount > 0) {
                // console.log('Updated document ID:', _CA);
                TG_alertNewGuard(await fetchCoinData(_CA), newlyAddedBalance / 1e9, balance / 1e9)
            } else {
                // console.log('No document was updated.');
            }
        }
    } else {
        // check to not refund again
        if (_theCoinInDB?.refundProcessed !== undefined && _theCoinInDB?.refundProcessed === true) {
            console.log("-- Refund already processed for this coin.");
            return;
        }
        if (_theCoinInDB.devCanClaimLockedSol == false || _theCoinInDB.days7PassedWithNoRug == false) {
            return res.status(500).json({
                error: 'Dev cannot claim sol yet..'
            })
        }
        if (_theCoinInDB.hasRuged == true) {
            return res.status(500).json({
                error: 'Dev rugged. Not valid.'
            })
        }

        if (_theCoinInDB.devBeenRefunded == true) {
            return res.status(500).json({
                error: 'Dev has already been refunded.'
            })
        }

        console.log("-- Lower than min: Refunding dev...")

        // refund the user
        const decryptedPrivKey = decrypt(_theCoinInDB.lockPVK)
        const keyPair = initializeKeypair(decryptedPrivKey)
        const transferResTX = await transferSOL(_theCoinInDB.dev, balance / 1e9, keyPair)

        if (transferResTX) {
            await _Collections.GuardedCoins.updateOne({
                ca: _CA
            }, {
                $set: {
                    balance: 0,
                    allowedSell: false,
                    firstDeposit: 0,
                    refundProcessed: true,
                }
            })
        }
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
        DBdata: {
            hasMigrated: _theCoinInDB?.hasMigrated,
            balance: _theCoinInDB?.balance,
            balance_allTimeHight: _theCoinInDB?.balance_allTimeHight,
            lockAddress: _theCoinInDB?.lockAddress
        },
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

async function verifyIfRugged(_CA) {
    try {
        const holders = _DBs.Holders.collection(_CA)
        const traders = await holders.find({}).toArray()

        let totalTokensBought = 0
        let totalSolBought = 0
        let totalSolSold = 0
        let totalTokensSold = 0
        const totalSupply = TOTALSUPPLY * 1e6
        let refundWallets = []

        if (traders.length > 0) {
            for (let i = 0; i < traders.length; i++) {
                const currentUser = traders[i]

                // Add up all insider data
                if (currentUser.tag == 'SNIPER' || currentUser.tag == 'DEV' ||
                    currentUser.tag == 'TRANSFER' || currentUser.isInsider == true) {

                    totalTokensBought += currentUser.totalTokensBought
                    totalSolBought += currentUser.totalSolBought
                    totalSolSold += currentUser.totalSolSold
                    totalTokensSold += currentUser.totalTokensSold
                } else {
                    refundWallets.push(currentUser)
                }
            }

            refundWallets.sort((a, b) => {
                if (isNaN(a.PnL) && !isNaN(b.PnL)) return 1;
                if (!isNaN(a.PnL) && isNaN(b.PnL)) return -1;
                if (!isNaN(a.PnL) && !isNaN(b.PnL)) return a.PnL - b.PnL;
                // If PnL is NaN, sort by totalSolBought
                return b.totalSolBought - a.totalSolBought;
            });

            const totalDevTeamSupplyOwned = ((totalTokensBought / totalSupply) * 100).toFixed(2)
            const totalDevTeamSupplySold = Math.abs((totalTokensSold / totalSupply) * 100).toFixed(2)

            console.log('--------------------------------------------------------')
            console.log('Rug Check For: ', _CA, " ==>")
            console.log('Total Team Supply Owned: ', totalDevTeamSupplyOwned + "%")
            console.log('Total Team Supply Sold: ', totalDevTeamSupplySold + "%")
            console.log('Total Team Sol bought: ', totalSolBought.toFixed(2))
            console.log('Total Team Sol Sold: ', totalSolSold.toFixed(2))


            // case where dev team owns less than 10%
            if(totalDevTeamSupplyOwned < 10) {
                const percentageOfOwnedSupplySold = (totalDevTeamSupplySold / totalDevTeamSupplyOwned) * 100;

                // If the team has sold more than 60% of what they own, consider it a rug
                if (percentageOfOwnedSupplySold > 60) {
                    console.log(`Was rugged: ${_CA} ==> calculating refund shares...`)
                    // Refund other wallets
                    const refunded = await refundHolders(refundWallets, _CA)
                    return true
                } 
                else {
                    console.log('Token has not rugged yet....')
                    return false                    
                }
            }
            // RUG Condition
            else if (totalDevTeamSupplySold > SUPPLY_RUG_THRESHOLD) {
                console.log(`Was rugged: ${_CA} ==> calculating refund shares...`)
                // Refund other wallets
                const refunded = await refundHolders(refundWallets, _CA)
                return true
            } else {
                console.log('Token has not rugged yet....')
                return false
            }

        } else {
            console.log('No data found for the given contract address:', _CA);
        }
    } catch (error) {
        console.error('Error fetching data from DB:', error);
    }
}


async function parseTokenTrades(_CA, _fetchDelay) {
    try {
        const _theCoin = await fetchCoinData(_CA)
        const allTrades = await getAllTradesPump(_CA, _fetchDelay || 3)

        if (!allTrades || !allTrades[0] || !allTrades[0].slot) {
            console.log('Issue with trades fetched....')
            console.log('Printing trade 0 :', allTrades[0])
            return 'Cant parse'
        }
        const sniperSlot = allTrades[0].slot
        const delayedSniperSlot = allTrades[1].slot
        const extraDelayedSniperSlot = allTrades[2].slot

        const devWallet = _theCoin.creator
        const _tokenPriceSol = _theCoin.market_cap / 1e9
        let delayedSnipingTransactions = [];
        let holders = {}

        for (var i = 0; i < allTrades.length; i++) {
            const trade = allTrades[i]

            if (!holders[allTrades[i].user])
                holders[allTrades[i].user] = {
                    address: allTrades[i].user,
                    totalSolBought: 0,
                    totalSolSold: 0,
                    PnL: 0,
                    totalTokensBought: 0,
                    totalTokensSold: 0,
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
                    holders[trade.user].tag = 'SNIPER'
                }
                holders[trade.user].totalTokensBought += trade.token_amount;
                holders[trade.user].totalSolBought += trade.sol_amount / 1e9;
                holders[trade.user].hasBought = true;
            } else {
                if (trade.slot == sniperSlot) {
                    holders[trade.user].tag = 'SNIPER'
                }
                holders[trade.user].totalTokensSold += trade.token_amount;
                holders[trade.user].totalSolSold += trade.sol_amount / 1e9;
                holders[trade.user].hasSold = true;
            }
            

            holders[trade.user].TXs.push(allTrades[i].signature)
            // for 1 block delay - to consider 2nd block delay
            if (trade.slot === delayedSniperSlot) {
                delayedSnipingTransactions.push(trade);
            }
        }
        
        if (delayedSnipingTransactions.length > DELAYED_BLOCK_SNIPERS_THRESHOLD) {
            for (const snipeTrade of delayedSnipingTransactions) {
                holders[snipeTrade.user].tag = 'SNIPER';
            }
        }


        for (const addr in holders) {
            const remainingTokens = await getTokenBalance(addr, _CA)
            await _delay(250)

            holders[addr].worthOfTokensSol = Math.abs((remainingTokens / 1e6) * Number(_tokenPriceSol))

            holders[addr].PnL = (Number(holders[addr].totalSolSold) - Number(holders[addr].totalSolBought)) +
                Number(holders[addr].worthOfTokensSol)
            // console.log(`Address: ${holders[addr].address} - Total Sold: ${holders[addr].totalSolSold} Total Bought: ${holders[addr].totalSolBought} - PNL: ${holders[addr].PnL}`)

            // Give priority to the DEV tag
            if (holders[addr].address == devWallet) {
                holders[addr].tag = 'DEV';
                continue;
            }

            if (holders[addr].tag == 'SNIPER') {
                continue;
            }

            // Added 2nd check incase someone buys to trick the code - relative 
            if ((holders[addr].hasSold && !holders[addr].hasBought) || (holders[addr].totalSolBought < 0.1 &&
                    holders[addr].totalSolSold > 3)) {
                holders[addr].tag = 'TRANSFER';
            } else if (holders[addr].hasBought && !holders[addr].hasSold) {
                holders[addr].tag = 'HOLDER';
            } else if (holders[addr].hasBought && holders[addr].hasSold) {
                holders[addr].tag = 'DEGEN';
            }
        }

        let holdersArray = Object.values(holders);

        // Sort the array based on PnL (bigger losers first)
        const sortedHolders = holdersArray.sort((a, b) => b.PnL - a.PnL);
        const newHolders = {};
        sortedHolders.forEach(holder => {
            newHolders[holder.address] = holder;
        });
        const maxInsiderCheck = 1000
        let insidersChecked = 0
        const INSIDER_HARD_CAP = 50

        // check if top pnl losers are insiders or not
        // console.log('started fetching sigs: ', new Date())
        for (const addr in newHolders) {
            if (insidersChecked >= maxInsiderCheck) continue
            const walletData = await fetchSignatures(newHolders[addr].address);
            if (walletData && walletData[1] !== undefined && walletData[1] < INSIDER_HARD_CAP) {
                holders[addr].isInsider = true
                holders[addr].tag = 'INSIDER'
            } else {
                holders[addr].isInsider = false
            }

            insidersChecked++
        }

        console.log("-- Finished fetching data for coin: ", _CA)
        // console.log('ended fetching sigs: ', new Date())

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
        holdersArray = holdersArray.sort((a, b) => b.PnL - a.PnL);

        const result = await collection.insertMany(holdersArray);
        if (result.insertedCount > 0) {
            console.log('New holders inserted: ', result.insertedCount);
        } else {
            console.log('No documents were inserted.');
            return "No documents were inserted";
        }
    } catch (e) {
        console.error('Error parsing trades: ', e)
        return "Parse Failed"
    }
}



async function refundHolders(holders, _CA) {
    try {
        const tokenData = await _Collections.GuardedCoins.findOne({
            ca: _CA
        })

        if (!tokenData || !tokenData.lockAddress || !tokenData.dev || !tokenData.lockPVK) {
            console.log("The coin was not found in DB: ", _CA)
            return
        }

        const _coinData = await fetchCoinData(_CA)
        if (!_coinData) {
            console.log("The coin was not found in pumpfun api: ", _CA)
            return
        }

        // For testing. Use above for prod
        const balance = tokenData.balance
        const actualSolAmount = balance / 1e9

        // First take out platform fee:
        const amountToReturn = actualSolAmount - PLATFORM_FEE

        let walletsToRefund = holders.slice(0, MAX_WALLET_REFUND)
        // only pick users for refund if their pnl is negative

        walletsToRefund = walletsToRefund.filter(wallet => wallet.PnL < 0 && wallet.tag !== 'DEV')

        const totalSolLostByTraders = walletsToRefund.reduce((total, wallet) => {
            return total + Math.abs(wallet.PnL)
        }, 0)

        const refundRatio = Math.abs(amountToReturn) / Math.abs(totalSolLostByTraders);

        console.log(
            `Setting refund logic for ${_CA} - Current Sol for refund: ${amountToReturn.toFixed(2)} - Total Lost by traders: ${totalSolLostByTraders.toFixed(2)} - Refund Ratio: ${refundRatio.toFixed(3)}`
        )
        // update the db and identify the coin as rugged
        await _Collections.GuardedCoins.updateOne({
            ca: _CA,
            hasRuged: false,
        }, {
            $set: {
                hasRuged: true,
                rugDetectDate: Date.now(),
            }
        })

        if (tokenData.platformFeeTaken == false) {
            // handle platform fee seperately
            try {
                const decryptedPrivKey = decrypt(tokenData.lockPVK)
                const keyPair = initializeKeypair(decryptedPrivKey)
                await takePumpGuardFee(keyPair, _CA)
            } catch (e) {
                console.error('Error during platform fee transfer:', e.message);
                return
            }

        }
        // Compute each wallet refund
        const refunds = walletsToRefund.map(wallet => {
            const refundAmount = wallet.PnL * refundRatio
            return {
                address: wallet.address,
                originalLoss: Math.abs(wallet.PnL.toFixed(3)),
                refundAmount: parseFloat(roundDownToThirdDecimal(refundAmount).toFixed(3)),
            };
        })

        // console.log('Refunds to process:', refunds)

        for (const refund of refunds) {
            let theUser = await _Collections.UsersRefunds.findOne({
                address: refund.address
            })

            // if the user doesn't exist, first create it in db
            if (!theUser) {
                theUser = await _Collections.UsersRefunds.insertOne({
                    address: refund.address,
                    totalClaimedRefunds: 0,
                    refunds: [],
                })
            }

            // store the calced refund data of the coin for this user so they can see it in UI and request to get paid
            // this query only pushes the object in `refunds` array only if there is already no object with the ca for the user
            // so if we call this whole function multiple times there wouldn't be duplicates created
            await _Collections.UsersRefunds.updateOne({
                address: refund.address,
                'refunds.ca': {
                    $ne: _CA
                }
            }, {
                $addToSet: {
                    refunds: {
                        ca: _CA,
                        refundAmount: Math.abs(refund.refundAmount),
                        originalLoss: refund.originalLoss,
                        paid: false,
                        paymentTx: null,
                        name: _coinData.name,
                        symbol: _coinData.symbol,
                        rugDetectDate: Date.now(),
                        image_uri: _coinData.image_uri,
                    },
                },
            });
        }
        console.log('Refund collection created')
    } catch (e) {
        console.log('Error processing holders refund', e)
    }
}

function roundDownToThirdDecimal(value) {
    return Math.floor(value * 1000) / 1000;
}

function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    getCoinLockAddress,
    updateLockAddressBalance,
    isCoinGuarded,
    parseTokenTrades,
    verifyIfRugged
}
