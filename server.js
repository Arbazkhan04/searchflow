require("dotenv").config();
const express = require("express");
const connectDb = require("./db/connect.js");
const errorHandler = require("./middleware/errorHandler.js");
const path = require('path'); 

const cors = require("cors");
const morgan = require("morgan");

const app = express();
const http = require("http");

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// Expose the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Log every request to the console
app.use(morgan(":method :url :status :response-time ms"));

// Routes
const userManagementRoutes = require("./routes/userManagementRouter.js");
const webFlowManagementRoutes = require("./routes/webFlowManagementRouter.js");




app.use("/api/userManagementRoutes", userManagementRoutes);
app.use("/api/webFlowManagementRoutes", webFlowManagementRoutes);




// Error Handling Middleware
app.use(errorHandler);


// Start the server
const start = async () => {
  try {
    await connectDb(process.env.MONGO_URL);
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
};

start();
