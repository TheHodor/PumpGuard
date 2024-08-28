const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
    Keypair,
    PublicKey
} = require('@solana/web3.js');
const {
    connection_helius,
    RPC_helius
} = require('../config');


function isSolanaAddress(_CA) {
    try {
        const owner = new PublicKey(_CA);
        return PublicKey.isOnCurve(owner.toString())
    } catch {
        return false
    }
}

const ONE_HOUR = 1000 * 60 * 60
let tries = {}

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


async function getTokenBalance(_userAddress, _tokenAddress) {
    const response = await fetch(RPC_helius, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'my-id',
            method: 'getAssetsByOwner',
            params: {
                ownerAddress: _userAddress,
                page: 1, // Starts at 1
                limit: 1000,
                displayOptions: {
                    showFungible: true //return both fungible and non-fungible tokens
                }
            },
        }),
    });
    const {
        result
    } = await response.json();

    if (result) {
        const token = result.items.find(
            (_itm) =>
            _itm.interface === "FungibleToken" && _itm.id === _tokenAddress
        );

        if (token) {
            return token.token_info.balance;
        } else {
            return 0
        }
    } else {
        return 0
    }

}


async function saveImage(ca, _URL) {
    if (tries[ca]) return 

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
        tries[ca] = true
        setTimeout(() => {
            tries[ca] = false
        }, ONE_HOUR )
        
       // console.error(`Error saving image for ${ca}`)
    }
}

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

module.exports = {
    isSolanaAddress,
    getSolBalance,
    getTokenBalance,
    saveImage,
    fetchCoinData
}
