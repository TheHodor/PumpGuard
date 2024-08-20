const { _Collections } = require("./DB_setup");
const {
    isSolanaAddress,
    getSolBalance
} = require("./helpers");


async function watchGuardedCoinsForMigration(intervalInSec) {
    setInterval(async () => {
        doCheck()
    }, intervalInSec * 1000)
    doCheck()

    async function doCheck() {
        // fetch all the unmigrated guarded coins from db 
        const _UnMigratedCoins = await _Collections.GuardedCoins.find({
            hasMigrated: false,
        }).toArray()

        // check everyone of them for migration
        for (const item of _UnMigratedCoins) {
            if (!item.ca) continue

            try {
                if (await hasCoinMigrated(item.ca)) {
                    // coin has migrated, proceed to refund the dev
                    console.log(`-- A coin has migrated: ${item.symbol} [${item.ca}].`)
                    doRefund(item.dev, item.lockAddress)
                } else {
                    // not yet migrated
                }
            } catch (error) {
                console.log(`E.106 for ${item.ca}: `, error);
            }

        }
    }
}


// a coin has migrated to raydium and now we are refunding the dev with 100% of the balance of the locked address
async function doRefund(devAddress, lockAddress) {
    const lockAddressBalance = await getSolBalance(lockAddress)
    if (!lockAddressBalance) return

    console.log(`Refunding a completed migration: ${lockAddressBalance / 1e9} Sol to ${devAddress}`)
    // send dev address the locked amount
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
    hasCoinMigrated
}
