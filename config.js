const {
    Connection,
    Keypair,
    PublicKey
} = require("@solana/web3.js");

const RPC_quickNode = "https://silent-evocative-hill.solana-mainnet.quiknode.pro/d136fd28a04e2635114d144add29319051ed3e4a/"
const RPC_ankr = "https://rpc.ankr.com/solana/2e1fb918cf30776f49ab4ef7151c6ca9559781bdd2f950f537858cf85595d46f";
const RPC_helius = "https://mainnet.helius-rpc.com/?api-key=0923441f-c558-4e0b-8b67-9294161fdfb3"
const RPC_shyft = "https://rpc.shyft.to?api_key=4EzHI9GGU3I9Xqsc"

const APIKEY_HELIUS = "0923441f-c558-4e0b-8b67-9294161fdfb3"
const APIKEY_SHYFT = "4EzHI9GGU3I9Xqsc"


const connection_helius = new Connection(RPC_helius);
const connection_ankr = new Connection(RPC_ankr);
const connection_quickNode = new Connection(RPC_quickNode)
const connection_shyft = new Connection(RPC_shyft)

fetchTokenPrices()
async function fetchTokenPrices() {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true')
        .then(response => response.json())
        .then(data => {
            prices.SOLANA = data.solana.usd
        })
        .catch(error => console.log(error));

    // update the coin prices every x minute
    setTimeout(() => {
        fetchTokenPrices()
    }, 1000 * 60 * 10)
}

let prices = {
    SOLANA: null
}

function getSolPrice() {
    return prices.SOLANA
}

module.exports = {
    getSolPrice,

    APIKEY_HELIUS,
    APIKEY_SHYFT,

    RPC_helius,
    RPC_ankr,
    RPC_shyft,
    RPC_quickNode,

    connection_helius,
    connection_ankr,
    connection_quickNode,
    connection_shyft,
}
