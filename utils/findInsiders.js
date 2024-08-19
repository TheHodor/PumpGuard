const fetch = require('node-fetch');

const INSIDER_HARD_CAP = 100
const RPC_helius = "https://mainnet.helius-rpc.com/?api-key=0923441f-c558-4e0b-8b67-9294161fdfb3"


async function fetchSignatures(address) {
    // Limit is 1000 max
    const params = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
            address,
            {
                limit: INSIDER_HARD_CAP
            }
        ]
    };

    try {
        const response = await fetch(RPC_helius, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        // console.log('Data returned from helius: ', data)
        const allTransactions = data.result

        if (allTransactions) {
            if (allTransactions.length === 0) {
                console.log('No transactions found for this address.');
                return null;
            }
            const lastTransaction = allTransactions[allTransactions.length - 1].signature
            // console.log('User Last signature: ', lastTransaction)
            const totalTrxns = allTransactions.length
            // console.log(`${address} total transactions count: ${totalTrxns}`)
            return [lastTransaction, totalTrxns]
        }
    } catch (error) {
        console.error(`Failed to fetch from helius for address ${address}:  ${error}`);
        throw error;
    }
}


async function parseAndProcessTransactions(trxn) {
    const url = "https://api.helius.xyz/v0/transactions/?api-key=0923441f-c558-4e0b-8b67-9294161fdfb3";


    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            transactions: [trxn],
        }),
    });

    const data = await response.json();

    const currentTime = new Date();

    const parsedResults = data.map(transaction => {
        if (transaction.type === 'TRANSFER') {
            const fundingWallet = transaction.feePayer;
            const date = new Date(transaction.timestamp * 1000);

            const timeDifference = currentTime - date;
            const hoursDifference = timeDifference / (1000 * 60 * 60);
            const isFreshy = hoursDifference < 24;

            console.log('Transaction Date:', date.toUTCString());
            console.log('Funding wallet:', fundingWallet);
            console.log('Was wallet funded within 48 hours?', isFreshy);

            return {
                date: date,
                fundingWallet: fundingWallet,
                isFreshy: isFreshy
            };
        }
        return null;
    });

    const validResults = parsedResults.filter(result => result !== null);

    return validResults;
}

const walletList = ['7a9bjyVUopiRkQkdePSv1GGqkS5hAvcrEJNZGLSpvjNE', // not insider
    'D18pTvQre5FHvZp3eNFZQT9wyMunSDMUymhSJdq91GgF' //  insider
]

// pass holders into this
async function findSuspiciousWallets(walletList) {
    let suspiousWallets = []
    const allPromises = walletList.map(async (wallet) => {
        const firstTrxn = await fetchSignatures(wallet)
        // Most likely a fresh wallet or some insider shit
        if (firstTrxn[0]) {
            console.log(`Wallet - ${wallet} is most likely insider.... Checking last trxn/funding status`)
            const parsedData = await parseAndProcessTransactions(firstTrxn[0])
            if (parsedData && parsedData.length > 0) {
                parsedData.forEach(transaction => {
                    if (transaction.isFreshy) {
                        suspiousWallets.push(wallet);
                    }
                });
            } else {
                console.log('No valid transactions found or the transaction type is not TRANSFER.');
            }
        }

    })
    await Promise.all(allPromises);

    // Log the list of suspicious wallets after all processing is done
    console.log('List of insider wallets: ', suspiousWallets);
}

// findSuspiciousWallets(walletList)
// fetchSignatures('GiLX2Dd8LQYYbgaBLrenG5jTpuno86iKiX8kXKCCn4Qa')

module.exports = {
    parseAndProcessTransactions,
    findSuspiciousWallets,
    fetchSignatures
}
