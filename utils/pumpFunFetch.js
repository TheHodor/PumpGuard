const {
    getCoinTradeVol,
    getCoinHolders
} = require("./apiFetch")
const {
    _Collections
} = require("./DB_setup")

let holdersCount = {
    // "00000000..0000": {
    //     count: 100,
    //     lastFetched: Date.now()
    // }
}
let volume1h = {}

const HOLDERS_UPDATERATE_MIN = 10
const VOLUME_UPDATERATE_MIN = 20


async function getTopProgressCoins() {
    let allTopCoins = []
    // each time we fetch 50 tokens
    // so... 5 = 250 tokens will be checked
    const howManyTimes = 7

    for (let i = 0; i < howManyTimes; i++) {
        let offset = i * 50
        let _URL =
            `https://frontend-api.pump.fun/coins?offset=${offset}&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=true&complete=false`

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
    allTopCoins = await setHolders(allTopCoins)
    allTopCoins = await setVolume(allTopCoins)

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

    topGuarded = topGuarded.slice(0, 20)
    topGuarded = await setHolders(topGuarded)
    topGuarded = await setVolume(topGuarded)

    return topGuarded
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

    recentlyGuarded = recentlyGuarded.slice(0, 20)
    recentlyGuarded = await setHolders(recentlyGuarded)
    recentlyGuarded = await setVolume(recentlyGuarded)

    return recentlyGuarded
}


async function setHolders(coins) {
    for (const coin of coins) {
        // find coin holders
        const __ca = coin.mint;
        const keyExists = Object.keys(holdersCount).includes(__ca);
        let _tokenHolders;

        // if holders count already exists and it's not too old
        if (keyExists && holdersCount[__ca].lastFetched < Date.now() - 1000 * HOLDERS_UPDATERATE_MIN) {
            _tokenHolders = holdersCount[__ca].count;
        } else {
            _tokenHolders = await getCoinHolders(__ca);
            if (!_tokenHolders) continue;

            holdersCount[__ca] = {
                count: _tokenHolders,
                lastFetched: Date.now(),
            };
        }

        coin.holders = _tokenHolders;
    }

    return coins
}


let _____calc = false
async function setVolume(coins) {
    return coins
    for (var i = 0; i < coins.length; i++) {
        if (_____calc) block
        // find coin holders
        const __ca = coins[i].mint
        const keyExists = Object.keys(volume1h).includes(__ca)
        let _volume1h

        // if volume amount already exists and it's not too old
        if (keyExists && volume1h[__ca].lastFetched < Date.now() - 1000 * VOLUME_UPDATERATE_MIN) {
            _volume1h = volume1h[__ca].amount
        } else {
            const coinTrades = await getAllTradesPump(__ca)
            console.log(__ca, "__ca", coinTrades)
            _____calc = true
            if (!coinTrades) continue

            volume1h[__ca] = {
                amount: _volume1h,
                lastFetched: Date.now()
            }
        }

        coins[i].volume1h = _volume1h
    }

    return coins
}







async function getAllTradesPump(ca) {
    let offset = 0;
    const allTrades = [];
    try {
        while (true) {
            const response = await fetch(
                `https://frontend-api.pump.fun/trades/${ca}?limit=200&offset=${offset}`, {
                    headers: {
                        accept: '*/*',
                        'accept-language': 'en-US,en;q=0.8',
                        'if-none-match': 'W/"12266-/HJ/xj010RRztcqVlXCQtyB5KTs"',
                        'sec-ch-ua': '"Brave";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
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
                    // console.log('got back 0: ', result.length)
                    break;
                }
                allTrades.push(...result);
                await delay(3000); // 2 sec to avoid getting rate limited + 1 sec to be safe
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


function _getCoinHolders(_CA) {
    const holders = holdersCount[_CA]

    if (holders) return holders.count.holderCount
    return "--"
}

function _getCoinVolume1h(_CA) {
    const volume = volume1h[_CA]

    if (volume) return volume
    return "--"
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    getTopProgressCoins,
    getTopGuardedCoins,
    getRecentlyGuardedCoins,
    getAllTradesPump,
    _getCoinHolders,
    _getCoinVolume1h
}
