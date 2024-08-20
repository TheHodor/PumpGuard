const request = require('request');
const { APIKEY_BITQUERY, APIKEY_HELIUS } = require('../config');


async function getCoinTradeVol(_CA) {
    var options = {
        'method': 'POST',
        'url': 'https://streaming.bitquery.io/eap',
        'headers': {
            'Content-Type': 'application/json',
            'X-API-KEY': APIKEY_BITQUERY,
            'Authorization': 'Bearer ory_at_VHowumN0tHHOSC-bfpg4qiL_TBgU2JUJ1mBZTrcWqz0.B1zYNRIAO97Nw75cN4a_WMoyNDW-DLwh3TQcOYcwV94'
        },
        body: JSON.stringify({
            "query": "query MyQuery {\n  Solana {\n    DEXTradeByTokens(\n      where: {\n        Trade: {\n          Currency: {\n            MintAddress: { is: \"2LXgD44pdixF4XzbwfnEhTMAF8qdH3jWnh9Satu2pump\" }\n          }\n          Dex: { ProtocolName: { is: \"pump\" } }\n        }\n        Block: { Time: { since: \"2024-06-27T06:46:00Z\" } }\n      }\n    ) {\n      Trade {\n        Currency {\n          Name\n          Symbol\n          MintAddress\n        }\n        Dex {\n          ProtocolName\n          ProtocolFamily\n        }\n      }\n      TradeVolume: sum(of: Trade_Amount)\n    }\n  }\n}",
            "variables": "{}"
        })

    };

    request(options, function (error, response) {
        if (error) throw new Error(error);
        let res = JSON.parse(response.body)

        console.log(res.data.Solana.DEXTradeByTokens[0].TradeVolume)
    });
}

// this function will return count of token holders and amount hold by top 10
async function getCoinHolders(_CA) {
    try {
        const url = `https://mainnet.helius-rpc.com/?api-key=` + APIKEY_HELIUS;
        let allOwners = []
        let cursor;

        while (true) {
            let params = {
                limit: 1000, // 1000 is max
                mint: _CA
            };

            if (cursor != undefined) {
                params.cursor = cursor;
            }

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: "helius-test",
                    method: "getTokenAccounts",
                    params: params,
                }),
            });

            const data = await response.json();
            if (!data.result || data.result.token_accounts.length === 0) {
                break;
            }

            data.result.token_accounts.forEach((account) => {
                allOwners.push(account);
            });

            cursor = data.result.cursor;
        }

        const holderCount = allOwners.length
        // console.log('Holders fetch from helius: ', holderCount)

        // allOwners = allOwners.sort((a, b) => b.amount - a.amount)
        // allOwners = allOwners.splice(0, 20)
        // let top10HoldersAmount = 0
        // let counted = 0
        // for (var i = 0; i <= 13; i++) {
        //     // exclude raydium address
        //     if (allOwners[i] && allOwners[i].owner) {
        //         if (allOwners[i].owner !== "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" && counted < 10) {
        //             top10HoldersAmount += parseInt(allOwners[i].amount)
        //             counted++
        //         }
        //     }
        // }
        // const top10HolderPerc = top10HoldersAmount * 100 / 100000000

        return ({
            top10HolderPerc: -1,
            holderCount: holderCount,
            allHolders: allOwners
        })

    } catch (err) {
        console.log(err)
    }
}


async function wrapper() {
    const holders = await getCoinHolders('JvsH4PneSEnvb32b94ZCnb9aduVPXW1eKFhwSoQpump')
    console.log('Holders: ', holders.allHolders)

}

// wrapper()

module.exports = {
    getCoinTradeVol,
    getCoinHolders
}
