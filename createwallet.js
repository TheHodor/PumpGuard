const {
    Keypair,
    PublicKey
} = require('@solana/web3.js');
const fs = require('fs');

const { initializeKeypair, transferSol, initializeConnection } = require('./utils/transferSol.js')

// Function to generate 15 wallets and save the public and private keys to a file
async function generateWalletsAndSaveToFile() {
    const wallets = [];

    for (let i = 0; i < 15; i++) {
        const newWallet = Keypair.generate();
        const walletAddress = newWallet.publicKey.toString();
        const privateKeyString = Buffer.from(newWallet.secretKey).toString('hex');

        wallets.push({
            address: walletAddress,
            privateKey: privateKeyString
        });
    }

    // Convert wallets array to a JSON string
    const walletsJson = JSON.stringify(wallets, null, 2);

    // Save the JSON string to a file
    fs.writeFileSync('wallets.json', walletsJson);

    console.log('Wallets generated and saved to wallets.json');
}


async function transferSolToAllWallets(amount, privKey) {
    const fromKeypair = initializeKeypair(privKey);
    const walletsData = JSON.parse(fs.readFileSync('wallets.json', 'utf8'));

    for (const wallet of walletsData) {
        const txid = await transferSOL(wallet.address, amount, fromKeypair); 
        if (txid) {
            console.log(`Transfer to ${wallet.address} was successful! TXID: ${txid}`);
        } else {
            console.log(`Transfer to ${wallet.address} failed!`);
        }
        await delay(3000);
    }
}

async function transferAllSolBackToMain(mainWalletAddress) {
    const connection = initializeConnection();
    const subWalletsData = JSON.parse(fs.readFileSync('wallets.json', 'utf8'));

    for (const wallet of subWalletsData) {
        const fromKeypair = initializeKeypair(wallet.privateKey);

        const balance = await connection.getBalance(fromKeypair.publicKey);
        const sourceBalanceInSol = balance / 1e9;

          if (sourceBalanceInSol > 0) {
            const transferAmountInSOL = sourceBalanceInSol - 0.001; // Account for transaction fee
            const txid = await transferSOL(mainWalletAddress, transferAmountInSOL, fromKeypair);

            if (txid) {
              console.log(`Transfer from ${wallet.address} to main wallet was successful! TXID: ${txid}`);
            } else {
              console.log(`Transfer from ${wallet.address} to main wallet failed!`);
            }
          } else {
            console.log(`Subwallet ${wallet.address} has insufficient balance.`);
          }
        await delay(3000); 
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const privateKey = ''

const mainAddress = ''


// generateWalletsAndSaveToFile();

// transferSolToAllWallets(0.1, privateKey)

// transferAllSolBackToMain(mainAddress)

