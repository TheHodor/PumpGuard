const { getCoinTradeVol, getCoinHolders } = require("./apiFetch")
const { _Collections } = require("./DB_setup")

async function getTopProgressCoins() {
    let allTopCoins = []

    // each time we fetch 50 tokens
    // so... 5 = 250 tokens will be checked
    const howManyTimes = 7 

    for (let i = 0; i < howManyTimes; i++) {
        let offset = i * 50
        let _URL = `https://frontend-api.pump.fun/coins?offset=${offset}&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=true&complete=false`

        try {
            let response = await fetch(_URL)
            let data = await response.json()
            let sortedTokens = data.slice().sort((a, b) => b.usd_market_cap - a.usd_market_cap)
            allTopCoins = [...allTopCoins, ...sortedTokens]
        } catch (error) {
            console.log("E.103", error)
        }
    }

    // If you want to sort allTopCoins once more globally by usd_market_cap
    allTopCoins.sort((a, b) => b.usd_market_cap - a.usd_market_cap)
    allTopCoins = allTopCoins.slice(0, 20)
    
    
    // getCoinTradeVol()
    //
    //

    return allTopCoins
}


async function getTopGuardedCoins() {

    let topGuarded = []
    const _topGuarded = await _Collections.GuardedCoins.find({}).sort({
        balance: -1
    }).limit(20).toArray()

    for (const item of _topGuarded) {
        if (!item.ca || item.ca.length < 30) continue

        try {
            const response = await fetch(`https://frontend-api.pump.fun/coins/${item.ca}`);
            const data = await response.json();

            if (data.creator && data.creator.length > 39 && data.creator.length < 49) {
                topGuarded.push(data);
            }
        } catch (error) {
            console.log(`E.104 for ${item.ca}: `, error);
        }

        // Add a 2-second delay after each fetch
        await delay(2000);
    }

    return topGuarded.slice(0, 20)
}


async function getRecentlyGuardedCoins() {
    let recentlyGuarded = []
    const _recentlyGuarded = await _Collections.GuardedCoins.find({}).sort({
        firstDeposit: 1
    }).limit(20).toArray()

    for (const item of _recentlyGuarded) {
        if (!item.ca || item.ca.length < 30) continue
        
        try {
            const response = await fetch(`https://frontend-api.pump.fun/coins/${item.ca}`);
            const data = await response.json();

            if (data.creator && data.creator.length > 39 && data.creator.length < 49) {
                recentlyGuarded.push(data);
            }
        } catch (error) {
            console.log(`E.104 for ${item.ca}: `, error);
        }

        // Add a 2-second delay after each fetch
        await delay(2000);
    }

    return recentlyGuarded.slice(0, 20)
}



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    getTopProgressCoins,
    getTopGuardedCoins,
    getRecentlyGuardedCoins
}
