const express = require("express");
const ObjectId = require("mongodb").ObjectId;
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("api is up");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.judr2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    //DB CONNECTION--------------------------------
    await client.connect();
    console.log("connected to db");
    const db = client.db("Bonsai");
    const productCollection = db.collection("products");
    const userCollection = db.collection("users");
    const orderCollection = db.collection("orders");

    //---------APIs------------------------------------------------------------------------------

    // GET SINGLE USER
    app.get("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const user = await userCollection.findOne({ uid: id });
        console.log(user);

        if (user?.uid) {
          res.json(user);
        } else {
          res.status(404).send("No User Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // ADD USER
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        if (!user?.email) {
          res.status(403).send("Invalid Input");
        }

        const result = await userCollection.insertOne(user);
        console.log("post user", result);
        if (result.acknowledged) {
          res.json(user);
        } else {
          throw new Error("Could not add User");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // UPDATE USER
    app.put("/users", async (req, res) => {
      try {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };

        if (user?.email) {
          const result = await userCollection.updateOne(filter, updateDoc, options);
          res.json(user);
          console.log("put user", result);
        } else {
          res.status(404).send("could not update user");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // UPDATE USER ROLE
    app.put("/users/role/:id", async (req, res) => {
      try {
        const user = req.body;
        const requester = req.params.id;
        if (requester) {
          const requesterAccount = await userCollection.findOne({ uid: requester });
          if (requesterAccount?.role === "admin") {
            const filter = { email: user.email };
            const updateDoc = { $set: { role: user.role } };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.json(result);
          }
        } else {
          res.status(403).json({ message: "Unauthorized" });
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    //GET ALL PRODUCTS
    app.get("/products", async (req, res) => {
      try {
        const limit = parseInt(req.query?.limit);
        console.log(limit);
        const cursor = productCollection.find({});
        if (limit) cursor.limit(limit);

        const products = await cursor.toArray();
        if (products) {
          res.json(products);
        } else {
          res.status(404).send("No products Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    //ADD PRODUCT
    app.post("/products", async (req, res) => {
      try {
        const product = req.body;

        if (!product?.title) {
          res.status(404).send("invalid input");
        }

        const result = await productCollection.insertOne(product);
        console.log(result);
        if (result.acknowledged) res.json(product);
        else throw new Error("Could Not add product");
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // GET SINGLE PRODUCT
    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const product = await productCollection.findOne({ _id: ObjectId(id) });

        if (product?._id) {
          res.json(product);
        } else {
          res.status(404).send("No product Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    //GET ALL ORDERS
    app.get("/orders", async (req, res) => {
      try {
        const cursor = orderCollection.find({});
        const orders = await cursor.toArray();

        console.log(orders);
        if (orders) {
          res.json(orders);
        } else {
          res.status(404).send("No Order Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // ADD ORDER
    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;
        if (!order?.uid) {
          res.status(403).send("Invalid Input");
        }

        const result = await orderCollection.insertOne(order);
        if (result.acknowledged) {
          res.json(order);
        } else {
          res.status(500).send("Internal Server Error");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // GET ORDER BY ID
    app.get("/orders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const order = await orderCollection.findOne({ _id: ObjectId(id) });
        console.log(order);

        if (order?._id) {
          res.json(order);
        } else {
          res.status(404).send("No Order Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // GET ORDERS BY USER
    app.get("/orders/user/:uid", async (req, res) => {
      try {
        const id = req.params.uid;
        console.log(id);
        const cursor = await orderCollection.find({ uid: id });
        const orders = await cursor.toArray();

        if (orders) {
          res.json(orders);
        } else {
          res.status(404).send("No Order Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    // UPDATE ORDER INFO
    app.put("/orders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const order = req.body;

        const filter = await orderCollection.findOne({ _id: ObjectId(id) });
        const options = { upsert: true };
        const updateDoc = { $set: order };

        const result = await orderCollection.updateOne(filter, updateDoc, options);

        if (result.acknowledged) res.json(order);
        else throw new Error("Could Not Update");
        //
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    //DELETE ORDER
    app.delete("/orders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };

        if (query) {
          const result = await orderCollection.deleteOne(query);
          console.log("deleted", result);
          res.json(result);
        } else {
          res.status(404).send("No Order Found");
        }
      } catch (err) {
        res.status(500).send(`internal server error: ${err}`);
      }
    });

    //--------------------------------------------------------------------------
  } catch (err) {
    console.log(err);
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("Listening to port: ", port);
});
