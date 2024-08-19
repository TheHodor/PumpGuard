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


    //
    //
    // only fetching holders for the top #1 coin for the sake of less api cost for test now
    const _tokenHolders = await getCoinHolders(allTopCoins[0].mint)
    allTopCoins[0].holders = _tokenHolders.holderCount
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

async function getAllTradesPump(ca) {
    let offset = 0;
    const allTrades = [];
    try {
        while (true) {
            const response = await fetch(
                `https://frontend-api.pump.fun/trades/${ca}?limit=200&offset=${offset}`,
                {
                    headers: {
                        accept: '*/*',
                        'accept-language': 'en-US,en;q=0.8',
                        'if-none-match': 'W/"12266-/HJ/xj010RRztcqVlXCQtyB5KTs"',
                        'sec-ch-ua':
                            '"Brave";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'cross-site',
                        'sec-gpc': '1',
                        Referer: 'https://www.pump.fun/',
                        'Referrer-Policy': 'strict-origin-when-cross-origin',
                    },
                    method: 'GET',
                }
            );
            if (response) {
                const result = await response.json();
                if (result.length === 0) {
                    console.log('got back 0: ', result.length)
                    break;
                }
                allTrades.push(...result);
                offset = offset + 200;
            }
        }
        // got back all trades
        const orderedTrades = allTrades.sort((a, b) => {
            if (a.slot !== b.slot) {
                return a.slot - b.slot;
            } else if (a.timestamp !== b.timestamp) {
                return a.timestamp - b.timestamp;
            } else {
                return a.tx_index - b.tx_index;
            }
        });
        console.log(`Total trades for ca ${ca} - ${orderedTrades.length}`)
        // console.log('First trade: ', orderedTrades[0])
        // console.log('2nd trade: ', orderedTrades[1])

        // console.log('3rd trade: ', orderedTrades[2])

        return orderedTrades
    } catch (e) {
        console.log('Error occured: ', e)
        return []
    }
}


// getAllTradesPump('FnpVAGTn1Tr4hEDzeERs8KGRV4FMjU3AdbAvU6iApump');




function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    getTopProgressCoins,
    getTopGuardedCoins,
    getRecentlyGuardedCoins,
    getAllTradesPump
}
