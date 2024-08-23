const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
    Keypair,
    PublicKey
} = require('@solana/web3.js');
const {
    connection_helius
} = require('../config');


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


async function saveImage(ca, _URL) {
    const fileName = `ico_${ca}.jpg`
    const filePath = path.join('main/imgs', fileName)

    // Check if the file already exists
    const fileExists = fs.existsSync(filePath)
    if (fileExists) {
        const savedImageUrl = `https://pumpguard.fun/imgs/${fileName}`
        return savedImageUrl
    }

    // If the file doesn't exist, download and save it
    try {
        const response = await axios.get(_URL, {
            responseType: 'stream'
        });

        await new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(filePath)
            response.data.pipe(fileStream)

            fileStream.on('error', reject)
            response.data.on('end', resolve)
        });

        const savedImageUrl = `https://pumpguard.fun/imgs/${fileName}`
        return savedImageUrl
    } catch (err) {
        console.error(`Error saving image for ${ca}`)
        throw err
    }
}

module.exports = {
    isSolanaAddress,
    getSolBalance,
    saveImage
}
