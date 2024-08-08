const {
    MongoClient,
    ServerApiVersion
} = require('mongodb')


const mongo_uri = "mongodb+srv://tom774pau:kuH3E6edKwKg0y2t@pumpguard.dqh9k.mongodb.net/?retryWrites=true&w=majority&appName=PumpGuard"

let _DBs = {
    Main: void 0,
    Etc: void 0,
}

let _Collections = {
    GuardedTokens: void 0,
    Stats: void 0
}


async function DBSetup() {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    const mongoClient = new MongoClient(mongo_uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await mongoClient.connect();
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({
        ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // set up connections to databases and their collection
    _DBs.Main = mongoClient.db("Main")
    _Collections.GuardedTokens = _DBs.Main.collection("GuardedTokens")
    
    _DBs.Etc = mongoClient.db("Etc")
    _Collections.Stats = _DBs.Main.collection("Stats")

    return {
        Collections: _Collections,
        DBs: _DBs
    }
}



module.exports = {
    DBSetup,
    _Collections,
    _DBs
}