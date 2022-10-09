const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ngyafc8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req,res,next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message:'Unauthorized access'});
  }
  const token = authHeader.split(' ')[1];
  // verify a token symmetric
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message:'Forbidden acccess'})
    }
    req.decoded = decoded;
    next();
    //console.log(decoded) // bar
});
}
async function run(){
  try{
    await client.connect();
    const serviceCollection = client.db("doctors_portal").collection("services");
    const bookingCollection = client.db("doctors_portal").collection("bookings");
    const userCollection = client.db("doctors_portal").collection("users");
    const doctorCollection = client.db("doctors_portal").collection("doctors");
    console.log('HH');


/*
api convention:
1.app.get('/booking') //get all booking in this collection or more than one by filter
2.app.get('/booking/:id')//get a specific // ID
3.appp.post('/booking') // add a new/post a booking
4.app.patch('/booking/:id')// update a booking // IDEA:
5.app.put('/booking/:id')// upsert => update[if exist] or insert[if not exist]
6.app.delete('/booking/:id') //delete a booking
*/

const verifyAdmin = async(req, res, next) =>{
  const requester = req.decoded.email;
  const requesterAccount = await userCollection.findOne({ email:requester });
  if(requesterAccount.role === 'admin'){
    next();
  }
  else{
      res.status(403).send({message: 'Forbidden acccess'})
    }
}
     app.get('/user', verifyJWT, async(req,res)=>{
      const users = await userCollection.find().toArray();
      res.send(users);
     })


    app.get('/service', async (req,res)=>{
      const query ={};
      const cursor = serviceCollection.find(query).project({name: 1});
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/admin/:email', async(req,res)=>{
      const email =req.params.email;
      const user = await userCollection.findOne({email:email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin});
    })

    app.put('/user/admin/:email', verifyJWT,verifyAdmin, async(req,res)=>{
      const email = req.params.email;

        const options = {upsert: true};
        // create a document that sets the plot of the movie
      const updateDoc = {
        $set:{role:'admin'},
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      console.log('admin api created');
      res.send(result);
    })


    app.put('/user/:email', async(req,res)=>{
      const email = req.params.email;
      const user = req.body;
      const query = {email: email};
      const options = {upsert: true};
      // create a document that sets the plot of the movie
    const updateDoc = {
      $set:user,
    };
    const result = await userCollection.updateOne(query, updateDoc, options);
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: 60 * 60 });
    console.log('put api created');
    res.send({result, token:token});
    })

    /* manual way get api of available slots
    app.get('/available', async(req,res)=>{
      const date = req.query.date || "Sep 4, 2022";
      //step 1:get all booking
      const services = await serviceCollection.find().toArray();
      //step2:get the booking of that day:
      const query ={date:date};
      const bookings = await bookingCollection.find(query).toArray();
      //step3:for each service, find booking for that service:
      services.forEach(service =>{
        const serviceBookings = bookings.filter(b=> b.treatment === service.name);
        const booked = serviceBookings.map(s=> s.slot);
        const available = service.slots.filter(s=>!booked.includes(s));
        service.available = available;

      })
      res.send(services);
    })
    */

      //this api is best to make in mongodb.use aggregate lookup, pipeline, match, group:
      app.get('/available', async(req,res)=>{
      const date = req.query.date;
      //step1:get all service
      const services = await serviceCollection.find().toArray();
      //step2:get the booking of that day:
      const query = {date: date};
      const bookings = await bookingCollection.find(query).toArray();
      //step3:for each service:
      services.forEach(service =>{
        //step4:find bookings for that service:
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        //step5:select slots for the service bookings:['a','b',....]
        const bookedSlots = serviceBookings.map(book => book.slot);
        //step6: select those slots that are not in bookedSlots:
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        //step7:set available slots to make it easier:
        service.slots = available;
      })
      res.send(services);

    })

// for particular user:
  //   app.get('/booking', async(req,res)=>{
  //   const patient = req.query.patient;
  //   const query = { patient: patient};
  //   const bookings = await bookingCollection.find(query).toArray();
  //   res.send(bookings);
  //
  // });

  // app.get('/booking', async(req,res)=>{
  //   const patient = req.query.patient;
  //   //const patient = req.query.patient;
  //   //const patient = req.query.paitent;
  //   const query = { patient: patient};
  //   const bookings = await bookingCollection.find(query).toArray();
  //   res.send(bookings);
  // });

app.get('/myBooking',verifyJWT, async(req, res) =>{
  const patient = req.query.patient;
  // const authorization = req.headers.authorization;
  // console.log('auth header',authorization);
  const decodedEmail = req.decoded.email;
  if(patient === decodedEmail){
  const query = {patient: patient};
  const bookings = await bookingCollection.find(query).toArray();
  //res.send(console.log(`There are ${bookings} plants in the collection`));
  console.log(bookings);
  return res.send(bookings);
}
else{
  return res.status(403).send({message: 'forbiffen access'});
}
})



    // To post data to db:
    // app.post('/booking', async(req,res)=>{
    //   const booking = req.body;
    //   const result = await bookingCollection.insertOne(booking);
    //   res.send(result);
    //   console.log(`A document was inserted with the _id: ${result.insertedId}`);
    //
    // })


    app.post('/booking', async(req,res)=>{
      const booking = req.body;
      const query = {treatment: booking.treatment, date:booking.date, patient:booking.patient}
      const exists = await bookingCollection.findOne(query);
      if(exists){
        return res.send({success: false,booking:exists})
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({success: true, result});
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
    });

    app.post('/doctor', verifyJWT, verifyAdmin, async(req,res)=>{
      const doctor= req.body;
      console.log(doctor);
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
      console.log('doctor api is hit',result);

    });

    app.get('/doctor', verifyJWT, verifyAdmin, async(req,res)=>{
       const doctors = await doctorCollection.find().toArray();
       res.send(doctors);
    });
    app.delete('/doctor/:email', verifyJWT, verifyAdmin, async(req,res)=>{
      const email = req.params.email;
      const filter = {email:email};
      const result = await doctorCollection.deleteOne(filter);
      res.send(result);
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
