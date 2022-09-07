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
    const bookingCollection = client.db("doctors_portal").collection("bookings");
    console.log('HH');


/*
api convention:
1.app.get('/booking') //get all booking in this collection or more than one by filter
2.app.get('/booking/:id')//get a specific // ID
3.appp.post('/booking') // add a new/post a booking
4.app.patch('/booking/:id')// update a booking // IDEA:
5.app.delete('/booking/:id') //delete a booking
*/




    app.get('/service', async (req,res)=>{
      const query ={};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

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

app.get('/myBooking', async(req, res) =>{
  const patient = req.query.patient;
  const query = {patient: patient};
  const bookings = await bookingCollection.find(query).toArray();
  //res.send(console.log(`There are ${bookings} plants in the collection`));
  console.log(bookings);
  res.send(bookings);
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
