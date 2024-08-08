async function updateTopCoins() {
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
            console.log("e", error)
        }
    }

    // If you want to sort allTopCoins once more globally by usd_market_cap
    allTopCoins.sort((a, b) => b.usd_market_cap - a.usd_market_cap)

    return allTopCoins.slice(0, 25)
}

module.exports = {
    updateTopCoins
}
