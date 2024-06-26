const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const port = 8000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");
app.listen(port, () => {
  console.log("Server is running on port 8000 pl");
});

mongoose
  .connect(
    "mongodb+srv://anisaskri:52978978aA@ecommerce.kqbp9od.mongodb.net/",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDb", err);
  });

const User = require("./models/user");
const SpotData = require("./models/spotdata");
const sendVerificationEmail = async (email, verificationToken) => {
  // Create a Nodemailer transporter
  const transporter = nodemailer.createTransport({
    // Configure the email service or SMTP details here
    service: "gmail",
    auth: {
      user: "askrianis74@gmail.com ",
      pass: "qlfeqidgtdxnfuor",
    },
  });

  // Compose the email message
  const mailOptions = {
    from: "SpotWise",
    to: email,
    subject: "Email Verification",
    text: `Please click the following link to verify your email: http://localhost:8000/verify/${verificationToken}`,
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};
// Register a new user
// ... existing imports and setup ...
// get all users
const GetUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const GetData = async (req, res) => {
  try {
    const data = await SpotData.find({});
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStatus = async (parkingSpaceId) => {
  try {
    // Find the document with the given parking space ID
    const document = await SpotData.findOne({ "parking_spaces.id": parkingSpaceId });

    // If document doesn't exist, return an error
    if (!document) {
      throw new Error("Parking spot not found");
    }

    // Find the parking space within the document
    const parkingSpace = document.parking_spaces.find(space => space.id === parkingSpaceId);

    // Update the status of the parking space to "pending"
    parkingSpace.status = "pending";

    // Save the updated document
    await document.save();

    // Return the updated parking space
    return parkingSpace;
  } catch (error) {
    throw error; // Forward the error to the caller
  }
};
app.put("/parking/:id/pending", async (req, res) => {
  try {
    const parkingSpaceId = req.params.id;
    const updatedParkingSpace = await updateStatus(parkingSpaceId);
    res.json(updatedParkingSpace);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});



// Define the route for GET request to fetch users
app.get("/users", GetUsers);
app.get("/data", GetData);
app.put("/parking/")
app.post("/data", async (req, res) => {
  try {
    const { floor, camera_id, parking_spaces } = req.body;
    const newSpotData = new SpotData({ floor, camera_id, parking_spaces });
    await newSpotData.save();
    console.log("DATA HAS BEEN SAVED SUCCEFULLY ");
  } catch (error) {
    console.log("Error during saving new spot DATA:", error); // Debugging statement
    res.status(500).json({ message: "Saving Failed" });
  }
});
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already registered:", email); // Debugging statement
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create a new user
    const newUser = new User({ name, email, password });

    // Generate and store the verification token
    newUser.verificationToken = crypto.randomBytes(20).toString("hex");
    console.log(newUser.verificationToken);
    // Save the user to the database
    await newUser.save();

    // Debugging statement to verify data
    console.log("New User Registered:", newUser);

    // Send verification email to the user
    // Use your preferred email service or library to send the email
    sendVerificationEmail(newUser.email, newUser.verificationToken);

    res.status(201).json({
      message:
        "Registration successful. Please check your email for verification.",
    });
  } catch (error) {
    console.log("Error during registration:", error); // Debugging statement
    res.status(500).json({ message: "Registration failed" });
  }
});

//endpoint to verify the email
app.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;

    //Find the user witht the given verification token
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(404).json({ message: "Invalid verification token" });
    }

    //Mark the user as verified
    user.verified = true;
    user.verificationToken = undefined;

    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Email Verificatioion Failed" });
  }
});
const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");

  return secretKey;
};

const secretKey = generateSecretKey();

//endpoint to login the user!
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    //check if the password is correct
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    //generate a token
    const token = jwt.sign({ userId: user._id }, secretKey);

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Login Failed" });
  }
});
