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



async function encryptPrivKey(priv) {

}


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

    if (balance > 0) {
        const _theCoinInDB = await _Collections.GuardedCoins.findOne({
            ca: _CA
        })

        let firstDepositDate = _theCoinInDB.firstDeposit
        if (_theCoinInDB.balance == 0) {
            firstDepositDate = Date.now()
        }
        
        const res = await _Collections.GuardedCoins.updateOne({
            ca: _CA
        }, {
            $set: {
                balance: balance,
                allowedSell: false,
                firstDeposit: firstDepositDate
            }
        })
    
        console.log(res)
    }

    return balance
}

// async function giveBackDevFunds(devWallet) {
//     const _theCoinInDB = await _Collections.GuardedCoins.findOne({
//         dev: devWallet
//     })

//     if (!_theCoinInDB || !_theCoinInDB.lockAddress) {
//         console.log("The coin was not found in DB")
//         return
//     }


// }



// async function takePumpGuardFee() {

// }

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


module.exports = {
    getCoinLockAddress,
    updateLockAddressBalance
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