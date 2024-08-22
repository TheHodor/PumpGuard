const {
    Keypair,
    PublicKey
} = require('@solana/web3.js');
const { connection_helius } = require('../config');


function isSolanaAddress(_CA) {
    try {
        const owner = new PublicKey(_CA);
        return PublicKey.isOnCurve(owner.toString())
    } catch {
        return false
    }
}



// get solana balance of an address (through shyft api)
async function getSolBalance(_address) {

    const balance = await connection_helius.getBalance(new PublicKey(_address))

    if (typeof balance == "number") {
        return balance
    } else {
        return false
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
    isSolanaAddress,
    getSolBalance
}
