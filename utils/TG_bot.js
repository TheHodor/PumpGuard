const TelegramBot = require('node-telegram-bot-api');
const { _getCoinHolders, _getCoinVolume1h } = require('./pumpFunFetch');


// Replace with your bot token and channel name
const botToken = '7449586246:AAEKIQAuQoruDff49YPte713Orms5dGD4iA';
const channelName = '@PumpGuardAlert';
const BUYEMOJIE = "🟢"

async function TG_alertNewGuard(coinsData, lockedSol, totalLockedSolana) {
    // Create a new bot instance
    const bot = new TelegramBot(botToken, {
        polling: false
    });

    let _buyEmojies = BUYEMOJIE
    for (var i = 0; i < (lockedSol / 0.05); i++) {
        _buyEmojies += BUYEMOJIE
    }

    let socials = ""
    if (coinsData.website) socials += `[Website](${coinsData.website}) `
    if (coinsData.telegram) socials += `[Telegram](${coinsData.telegram}) `
    if (coinsData.twitter) socials += `[Twitter](${coinsData.twitter})`

    const holders = _getCoinHolders(coinsData.mint)
    const volume1h = _getCoinVolume1h(coinsData.mint)

    // Message to send
    const message = `
*New Solana Locked In!*
    
*${lockedSol.toFixed(4)}* Solana was just locked for *${coinsData.name} [${coinsData.symbol}]*:
${_buyEmojies}

*${coinsData.name}* is now being guarded with ${totalLockedSolana.toFixed(4)} Solana.
*CA: ${(coinsData.mint).toString()}*

- MarketCap: *${parseInt(coinsData.usd_market_cap).toLocaleString()} USD*
- Volume.1h: *${volume1h}*
- Holders: *${holders}*
- Coin Age: *${timeDifference(Date.now(), coinsData.created_timestamp)}*
- Socials: ${socials}

Follow PumpGuard on [Twitter](https://x.com/google), visit our [Coin Review Channel](https://t.me/pumpguard), and be part of our [Chat Group](https://t.me/pumpguardchat).
    
`;

    // Inline keyboard buttons
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: "TX hash",
                    url: "https://example.com"
                }, {
                    text: `${coinsData.symbol} on pump.fun`,
                    url: `https://pump.fun/${coinsData.mint}`
                }],
                [{
                    text: "Buy On BullX",
                    url: "https://tst.com"
                }, {
                    text: "Buy On Trojan",
                    url: "https://tst.com"
                }]
            ]
        },
        parse_mode: 'Markdown'
    };

    // Send the complex message with buttons
    bot.sendMessage(channelName, message, options)
        .then(() => {
            console.log('Message sent successfully');
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}





function timeDifference(current, previous) {
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' sec';
    } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' min';
    } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hours';
    } else if (elapsed < msPerMonth) {
        return Math.round(elapsed / msPerDay) + ' days';
    } else if (elapsed < msPerYear) {
        return Math.round(elapsed / msPerMonth) + ' months';
    } else {
        return Math.round(elapsed / msPerYear) + ' years';
    }
}



module.exports = {
    TG_alertNewGuard,
}
