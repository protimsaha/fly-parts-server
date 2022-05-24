const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const app = express()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
require('dotenv').config()

app.use(cors())
app.use(express.json())



var MongoClient = require('mongodb').MongoClient;

var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.nh8cc.mongodb.net:27017,cluster0-shard-00-01.nh8cc.mongodb.net:27017,cluster0-shard-00-02.nh8cc.mongodb.net:27017/?ssl=true&replicaSet=atlas-1089r9-shard-0&authSource=admin&retryWrites=true&w=majority`;
MongoClient.connect(uri, function (err, client) {

    function verifyJWT(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).send({ message: 'UnAuthorized access' });
        }
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
            if (err) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            req.decoded = decoded;

            next();
        });
    }

    async function run() {

        try {
            await client.connect()
            const toolsCollection = client.db('Assignment-12').collection('tools')
            const orderCollection = client.db('Assignment-12').collection('orders')
            const usersCollection = client.db('Assignment-12').collection('users')
            const reviewsCollection = client.db('Assignment-12').collection('reviews')

            app.put('/user/:email', async (req, res) => {
                const email = req.params.email;
                const user = req.body;
                const options = { upsert: true };
                const filter = { email: email }
                const updateDoc = {
                    $set: user,
                }
                const result = await usersCollection.updateOne(filter, updateDoc, options)
                const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
                res.send({ result, token })
            })


            app.get('/tools', async (req, res) => {
                const cursor = toolsCollection.find({})
                const tools = await cursor.toArray()
                res.send(tools)
            })

            app.get('/tools/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: ObjectId(id) }
                const result = await toolsCollection.findOne(query)
                res.send(result)
            })

            app.get('/users', async (req, res) => {
                const cursor = usersCollection.find({})
                const users = await cursor.toArray()
                res.send(users)
            })

            app.get('/reviews', async (req, res) => {
                const cursor = reviewsCollection.find({})
                const reviews = await cursor.toArray()
                res.send(reviews)
            })

            app.post('/orders', async (req, res) => {
                const order = req.body;
                const result = await orderCollection.insertOne(order)
                res.send(result)
            })

            app.get('/orders', async (req, res) => {
                const email = req.query.email;
                const query = { email: email }
                const orders = await orderCollection.find(query).toArray()
                return res.send(orders)
            })


            app.post('/reviews', async (req, res) => {
                const order = req.body;
                const result = await reviewsCollection.insertOne(order)
                res.send(result)
            })

            app.get('/admin/:email', async (req, res) => {
                const email = req.params.email;
                const user = await usersCollection.findOne({ email: email })
                const isAdmin = user.role === 'admin';
                res.send({ admin: isAdmin })
            })

            app.put('/user/admin/:email', verifyJWT, async (req, res) => {
                const email = req.params.email;
                const requister = req.decoded.email;
                const requisterAccount = await usersCollection.findOne({ email: requister })
                if (requisterAccount.role === 'admin') {
                    const filter = { email: email };
                    const updatedDoc = {
                        $set: {
                            role: 'admin'
                        }
                    }
                    const result = await usersCollection.updateOne(filter, updatedDoc)
                    res.send(result)
                } else {
                    res.status(403).send({ message: 'forbidden access' })
                }
            })



        }

        finally {
        }

    }

    run().catch(console.dir)

});



app.get('/', (req, res) => {
    res.send('Assignment-12 server is running')
})

app.listen(port, () => {
    console.log('Listening to assignment port', port)
})