const {
    _Collections,
    _DBs
} = require('./DB_setup.js');

// Function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to make the API call
async function callParseTradesAPI() {
    const _UnMigratedCoins = await _Collections.GuardedCoins.find({
        hasMigrated: false,
        devRefunded: false,
        hasRuged: false
    }).toArray();

    for (const token of _UnMigratedCoins) {
        if (!token.ca) continue;

        try {
            const url = `http://localhost:8080/parse_trades?ca=${token.ca}`;
            const response = await fetch(url);
            let data = await response.json();
            console.log(`Response for CA: ${token.ca} - ${data}`);
        } catch (error) {
            console.log(`Couldn't fetch from pump for ${token.ca}: `, error);
        }

        const minDelay = 1 * 60 * 1000; 
        const maxDelay = 3 * 60 * 1000; 
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        await delay(randomDelay);
    }
    
    scheduleNextCall();
}

function scheduleNextCall() {
    const min = 30 * 60 * 1000; 
    const max = 60 * 60 * 1000; 
    const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;

    console.log(`Next API call scheduled in ${randomDelay / 1000 / 60} minutes`);
    setTimeout(callParseTradesAPI, randomDelay);
}

callParseTradesAPI();
