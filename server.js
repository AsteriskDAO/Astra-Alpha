// express server
const express = require('express');
const dotenv = require('dotenv');
const cors = require('./middleware/cors');
const connectDB = require('./config/database');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const port = 3000;

// Apply CORS before other middleware
app.use(cors);

app.use(express.json());

require('./routes')(app);

require('./bots/tgBot');  

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

