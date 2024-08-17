const {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  Keypair,
  ComputeBudgetProgram,
} = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config();

const API_KEY = "0923441f-c558-4e0b-8b67-9294161fdfb3"

function initializeKeypair(privKey) {
  const privateKey = new Uint8Array(bs58.decode(privKey));
  const keypair = Keypair.fromSecretKey(privateKey);
  console.log(`Initialized Keypair: Public Key - ${keypair.publicKey.toString()}`);
  return keypair;
}

function initializeConnection() {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
  const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
  return connection;
}

async function transferSOL(wallet, amount, fromKeypair) {
  console.log('Starting SOL Transfer Process');

  const connection = initializeConnection();

  const destinationWallet = new PublicKey(wallet);

  const balance = await connection.getBalance(fromKeypair.publicKey);
  const sourceBalance = balance / 1e9; 
  console.log(`Source Account Balance: ${sourceBalance} SOL`);

  if (sourceBalance <= 0) {
    console.log('Insufficient balance to perform transfer.');
    return;
  }

  const transferAmountInSOL = amount - 0.001; // fees
  const transferAmountInLamports = Math.floor(transferAmountInSOL * 1e9);

  const PRIORITY_RATE = 20000;
  const PRIORITY_FEE_INSTRUCTIONS = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: PRIORITY_RATE,
  });

  const transferInstruction = SystemProgram.transfer({
    fromPubkey: fromKeypair.publicKey,
    toPubkey: destinationWallet,
    lamports: transferAmountInLamports,
  });

  let latestBlockhash = await connection.getLatestBlockhash('confirmed');

  const messageV0 = new TransactionMessage({
    payerKey: fromKeypair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [PRIORITY_FEE_INSTRUCTIONS, transferInstruction],
  }).compileToV0Message();

  const versionedTransaction = new VersionedTransaction(messageV0);
  versionedTransaction.sign([fromKeypair]);

  try {
    const txid = await connection.sendTransaction(versionedTransaction, {
      maxRetries: 20,
    });

    const confirmation = await connection.confirmTransaction(
      {
        signature: txid,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error('Transaction not confirmed.');
    }

    console.log(`Transaction Successfully Confirmed! View on SolScan: https://solscan.io/tx/${txid}`);
    return txid
  } catch (error) {
    console.error('Transaction failed', error);
  }
}

// const testPair = initializeKeypair(process.env.PRIVATE_KEY)
// transferSOL('4YofY9785L7MMeqdbB3YTKGTM7TnPqe9WRxMt7GrYNXn', 0.1, testPair);

module.exports = {
  initializeKeypair,
  transferSOL
}