const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ngyafc8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
  try{
    await client.connect();
    const serviceCollection = client.db("doctors_portal").collection("services");
    console.log('HH');

    app.get('/service', async (req,res)=>{
      const query ={};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    })


  }finally{

  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
  res.send('Hello');
})

app.listen(port, ()=>{
  console.log(`Example app listening in port ${port}`)
})
