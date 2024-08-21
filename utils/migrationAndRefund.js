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
    transferSol
} = require('./transferSol')

const LONETRADER_WALLET = '123123'
const LYMN_WALLET = '2131231'
const PLATFORM_FEE = 0.2


async function watchGuardedCoinsForMigration() {
    // fetch all the unmigrated guarded coins from db 
    const _UnMigratedCoins = await _Collections.GuardedCoins.find({
        hasMigrated: false,
        devRefunded: false
    }).toArray()

    // check everyone of them for migration
    for (const item of _UnMigratedCoins) {
        if (!item.ca) continue

        try {
            if (await hasCoinMigrated(item.ca)) {
                // coin has migrated, proceed to refund the dev
                console.log(`-- A coin has migrated: ${item.symbol} [${item.ca}].`)
                doDevRefund(item.dev, item.lockAddress, item.lockPVK)
            } else {
                // not yet migrated
            }
        } catch (error) {
            console.log(`E.106 for ${item.ca}: `, error);
        }

    }
}



// a coin has migrated to raydium and now we are refunding the dev with 100% of the balance of the locked address
// send dev address the locked amount
async function doDevRefund(devAddress, lockAddress, lockPVK) {
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
        await takePumpGuardFee(keyPair)

        // return to dev
        const trnxHash = await transferSol(devAddress, amountToReturn_toDev, keyPair)
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

async function takePumpGuardFee(keyPair) {
    const lonetraderHash = await transferSol(LONETRADER_WALLET, (PLATFORM_FEE / 2), keyPair)
    const lymnHash = await transferSol(LYMN_WALLET, (PLATFORM_FEE / 2), keyPair)

    if (lonetraderHash) {
        console.log('Lonetrader hash: ', lonetraderHash);
    } else {
        console.log('Lonetrader transfer failed.');
    }

    if (lymnHash) {
        console.log('Lymn Hash: ', lymnHash);
    } else {
        console.log('Lymn transfer failed.');
    }
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
            return true
        }

    } catch (error) {
        console.log("E.105: ", error)
    }
}



module.exports = {
    watchGuardedCoinsForMigration,
    hasCoinMigrated,
    takePumpGuardFee
}
