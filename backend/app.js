const express = require("express");
const cors = require("cors");

const sessionRoutes = require('./routes/sessionRoutes')

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/sessions", sessionRoutes);

module.exports = app;
