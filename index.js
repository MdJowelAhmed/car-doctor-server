const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser=require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

// middleWere
app.use(cors({
    origin:['http://localhost:5173'],
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())



// mongodb code 


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ma7e2wv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// custom middlewere
const verifiedToken=async(req,res,next)=>{
    const token=req.cookies?.token
    console.log('verified token',token)
    if(!token){
        return res.status(401).send({message:'Not Authorized'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        // error 
        if(err){
            return res.status(401).send({message:'Un-Authorized'})
        }
        // console.log('value is valid',decoded)
        req.user=decoded;
        next()
        // if token is valid 
    })
   
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const servicesCollection=client.db('carDoctor').collection('services');
        const bookingsCollection=client.db('carDoctor').collection('bookings')

        // auth related api 
        app.post('/jwt',async(req,res)=>{
            const user=req.body
            console.log(user)
            const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})

            res
            .cookie('token',token,{
                httpOnly:true,
                secure:false,
                sameSite: 'strict',
            })
            .send({success:true})
        })

        // services api 
        app.get('/services',async(req,res)=>{
            const cursor=servicesCollection.find()
            const result=await cursor.toArray()
            res.send(result)
        })

        app.get('/services/:id', async(req,res)=>{
            const id=req.params.id;
            const query={_id: new ObjectId(id)}
            const options = {
               
                // Include only the `title` and `imdb` fields in the returned document
                projection: { _id: 0, title: 1,service_id: 1, img: 1, price:1,facilities:1, description: 1 },
              };
            const result=await servicesCollection.findOne(query , options)
            res.send(result)
        })

        app.get('/bookings',verifiedToken, async(req,res)=>{
            console.log(req.query.email)
            // console.log('took took token', req.cookies.token)
            let query={};
            if(req.query.email !== req.user.email){
                return res.status(403).send({message:"forbidden access"})
            }
            if(req.query?.email){
            query= {email:req.query.email}
            }
            const result=await bookingsCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/bookings',async(req,res)=>{
            const booking=req.body
            console.log(booking)
            const result=await bookingsCollection.insertOne(booking)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Doctor is Running')
})

app.listen(port, () => {
    console.log(`car doctor server is running on port ${port}`)
})