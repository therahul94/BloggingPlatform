const express = require('express')
const app = express()
const route = require("./routes/route.js")
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoose = require('mongoose')
require("dotenv").config();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.static("src/Public"));
app.use(express.urlencoded({ extended: true }));

mongoose.set('strictQuery', true);
mongoose
  .connect(
    process.env.DB_STR,
    {
      useNewUrlParser: true,
    }
  )
  .then(() =>
    console.log("MongoDB is connected...")
  )
  .catch((err) => console.log(err));

  app.use("/", route);

  app.listen(process.env.PORT || 3000, function () {
    console.log("App running on port " + (process.env.PORT || 3000));
  });
  