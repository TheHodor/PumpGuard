

async function fetchGmGuTrades(ca) {
    const res = await fetch(`https://gmgn.ai/defi/quotation/v1/trades/sol/${ca}?limit=1000&maker=`, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "if-none-match": "W/\"15db2-AmY5nhrig9Sp/Gk/5eUiWJa0qzY\"",
          "priority": "u=1, i",
          "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "cookie": "_ga=GA1.1.416821594.1719173656; _ga_0XM0LYXGC8=GS1.1.1723561610.58.0.1723562264.0.0.0",
          "Referer": "https://gmgn.ai/sol/token/37qBd11o5xDuun1rzdfzTroCojEdc6tQwm7q8YG3pump?symbol=wCAT",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
      });
      const data = await res.json()
      const allTrades = data.data.history
      const extractedData = allTrades.map(trade => {
        let newTrade = {
            address: trade.maker,
            timeStamp: trade.timestamp,
            event: trade.event,
            hash: trade.tx_hash,
            baseAmount: trade.base_amount,
            quoteAmount: trade.quote_amount,
            amountUsd: trade.amount_usd.toFixed(2)
        }
        return newTrade
      })
      console.log('All Trades: ', extractedData)
      return extractedData
}


fetchGmGuTrades('37qBd11o5xDuun1rzdfzTroCojEdc6tQwm7q8YG3pump')