const {
    _Collections
} = require("./DB_setup");
const {
    encrypt,
    decrypt
} = require('./encrypt.js');
const {
    isSolanaAddress,
    getSolBalance
} = require("./helpers");
const {
    initializeKeypair,
    transferSOL
} = require('./transferSol')

const LONETRADER_WALLET = 'aPL1kDnMXGoG2UWi3HF1Fyfa35kFsSJCfCq8ajdGx6G'
const LYMN_WALLET = 'DSy1oMvMbbLhSNS2Lr3DbBtVqchq6C8ZaF5MpLoDZEst'
const PLATFORM_FEE = 0.2


// async function watchGuardedCoinsForMigration() {
//     // fetch all the unmigrated guarded coins from db 
//     const _UnMigratedCoins = await _Collections.GuardedCoins.find({
//         hasMigrated: false,
//         devRefunded: false
//     }).toArray()

//     // check everyone of them for migration
//     for (const item of _UnMigratedCoins) {
//         if (!item.ca) continue

//         try {
//             if (await hasCoinMigrated(item.ca)) {
//                 // coin has migrated, proceed to refund the dev
//                 console.log(`-- A coin has migrated: ${item.symbol} [${item.ca}].`)
//                 doDevRefund(item.dev, item.lockAddress, item.lockPVK, item.ca)
//             } else {
//                 // not yet migrated
//             }
//         } catch (error) {
//             console.log(`E.106 for ${item.ca}: `, error);
//         }

//     }
// }



// a coin has migrated to raydium and now we are refunding the dev with 100% of the balance of the locked address
// send dev address the locked amount
async function doDevRefund(devAddress, lockAddress, lockPVK, ca) {
    const lockAddressBalance = await getSolBalance(lockAddress)
    if (!lockAddressBalance) return

    console.log(`Refunding a completed migration: ${lockAddressBalance / 1e9} Sol to ${devAddress}`)

    try {
        const decryptedPrivKey = decrypt(lockPVK)
        const keyPair = initializeKeypair(decryptedPrivKey)

        // Take platform fee - 0.2 sol to start
        const balance = await getSolBalance(lockAddress)
        const amountToReturn_toDev = (balance / 1e9) - PLATFORM_FEE
        // Transfer cash to our wallets
        await takePumpGuardFee(keyPair, ca)

        // return to dev
        const trnxHash = await transferSOL(devAddress, amountToReturn_toDev, keyPair)
        if (!trnxHash) {
            console.log("Dev Refund Transfer Failed!")
            return false
        }

        await _Collections.GuardedCoins.updateOne({
            ca: _CA
        }, {
            $set: {
                status: 'refunded',
                hash: trnxHash
            }
        })

    } catch (e) {
        console.error('Fail during returning dev funds: ', e)
    }
}

async function takePumpGuardFee(keyPair, _CA) {
    const _theCoinInDB = await _Collections.GuardedCoins.findOne({
        ca: _CA
    })
    let lonetraderHash;
    let lymnHash;

    if (!_theCoinInDB.loneTrader_hash || !_theCoinInDB.loneTrader_hash.length < 30) {
        lonetraderHash = await transferSOL(LONETRADER_WALLET, (PLATFORM_FEE / 2), keyPair);

        if (!lonetraderHash) {
            console.log('Lonetrader transfer failed.');
            throw new Error('Failed to take platform fee: Lonetrader transfer failed.');
        } else {
            await _Collections.GuardedCoins.updateOne({
                ca: _CA
            }, {
                $set: {
                    loneTrader_hash: lonetraderHash
                }
            });
        }
    } else {
        lonetraderHash = _theCoinInDB.loneTrader_hash;
    }

    if (!_theCoinInDB.lymnQ_hash || !_theCoinInDB.lymnQ_hash.length < 30) {
        lymnHash = await transferSOL(LYMN_WALLET, (PLATFORM_FEE / 2), keyPair);

        if (!lymnHash) {
            console.log('Lymn transfer failed.');
            throw new Error('Failed to take platform fee: Lymn transfer failed.');
        } else {
            await _Collections.GuardedCoins.updateOne({
                ca: _CA
            }, {
                $set: {
                    lymnQ_hash: lymnHash
                }
            });
        }
    } else {
        lymnHash = _theCoinInDB.lymnQ_hash;
    }

    console.log(`Platform fee taken - Lonetrader Hash: ${lonetraderHash} - Lymn Hash: ${lymnHash}`);

    await _Collections.GuardedCoins.updateOne({
        ca: _CA
    }, {
        $set: {
            platformFeeTaken: true
        }
    });
}

// This function checks if a coin has migrated to raydium or not
async function hasCoinMigrated(_CA) {
    if (!await isSolanaAddress(_CA)) {
        console.log("** Not a Sol Address: ", _CA);
        return false;
    }

    try {
        let response = await fetch(`https://frontend-api.pump.fun/coins/${_CA}`)
        let data = await response.json()

        if (data.complete == false && data.raydium_pool == null) {
            return false
        } else {
            await _Collections.GuardedCoins.updateOne({
                ca: _CA
            }, {
                $set: {
                    hasMigrated: true,

                    migrateDate: Date.now()
                }
            })

            console.log("coin has migrated: ", _CA)
            return true
        }

    } catch (error) {
        console.log("E.105: ", error)
    }
}



module.exports = {
    hasCoinMigrated,
    takePumpGuardFee
}
