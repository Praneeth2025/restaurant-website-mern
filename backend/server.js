const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT ||  5000;
const DATA_FILE_PATH = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "myapp"
});

// Connect to MySQL database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database.');
});

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail
  auth: {
    user: 'vamsipraneeth2004@gmail.com', // Your email address
    pass: 'mnux xved beeu rmso', // Your email password or app password
  },
});

// API endpoint to register a user
app.post('/myapp', (req, res) => {
  const { username, password, email } = req.body;

  // Simple validation
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  // Insert user into 'login' table
  const sql = 'INSERT INTO login (username, password, email) VALUES (?, ?, ?)';
  db.query(sql, [username, password, email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error registering user' });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// API endpoint for login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const datas = { username: username };

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide both username and password' });
  }

  // Query to check user credentials
  const sql = 'SELECT * FROM login WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error checking user credentials' });
    }

    if (result.length > 0) {
      fs.writeFile(DATA_FILE_PATH, JSON.stringify(datas, null, 2), (err) => {
        if (err) {
          console.error('Error writing file:', err);
          return res.status(500).json({ error: 'Error writing file' });
        }

        res.status(200).json({ success: true, data: datas });
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// API endpoint to save data
app.post('/api/saveData', (req, res) => {
  const { date, name, rate, veg, nonVeg, quantity } = req.body;

  // Read existing data from the JSON file
  fs.readFile(DATA_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Error reading file' });
    }

    let globalData = {};
    try {
      globalData = JSON.parse(data); // Parse the JSON data
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing JSON' });
    }

    const username = globalData.username;

    // Check if the combination of username and name already exists
    const checkSql = 'SELECT * FROM newlist WHERE username = ? AND name = ?';
    db.query(checkSql, [username, name], (err, result) => {
      if (err) {
        console.error('Error checking existing data:', err);
        return res.status(500).json({ message: 'Error checking existing data' });
      }

      if (result.length > 0) {
        // If the row with the same username and name exists, return a message
        return res.status(400).json({ message: 'Entry already exists for the given username and name' });
      }

      // If the row doesn't exist, insert the new data
      const insertSql = 'INSERT INTO newlist (date, name, rate, veg, nonVeg, quantity, username) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.query(insertSql, [date, name, rate, veg, nonVeg, quantity, username], (err, result) => {
        if (err) {
          console.error('Error saving data to database:', err);
          return res.status(500).json({ message: 'Error saving data to database' });
        }
        res.status(201).json({ message: 'Data saved successfully', data: { date, name, rate, veg, nonVeg, quantity, username } });
      });
    });
  });
});

// API to get data for a specific user
app.get('/api/userData', (req, res) => {
  // Read existing data from the JSON file
  fs.readFile(DATA_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Error reading file' });
    }

    let globalData = {};
    try {
      globalData = JSON.parse(data); // Parse the JSON data
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing JSON' });
    }

    const username = globalData.username || 'vamsi';  // Default to 'vamsi' if not in JSON

    // SQL query to fetch data where username matches
    const sql = 'SELECT * FROM newlist WHERE username = ?';
    db.query(sql, [username], (err, result) => {
      if (err) {
        console.error('Error fetching user data:', err);
        return res.status(500).json({ message: 'Error fetching user data' });
      }

      // Send the result as a JSON response
      res.status(200).json(result);  // `result` is an array of rows (each row is a dictionary)
    });
  });
});

// API endpoint to send email
app.post('/api/send-email', async (req, res) => {
  const { bookingDetails } = req.body; // Get the booking details from the request

  const mailOptions = {
    from: 'vamsipraneeth2004@gmail.com', // Your email address
    to: 'mrvirtuoso31@gmail.com', // Replace with the recipient's email address
    subject: 'Booking Request',
    text: bookingDetails, // Send the formatted booking string
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Booking request sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email.', error: error.message }); // Ensure this is a JSON response
  }
});




const stripe = Stripe('sk_test_tR3PYbcVNZZ796tH88S4VQ2u');


// Endpoint to create a payment intent
app.post('/api/payment', async (req, res) => {
  const { amount, currency } = req.body; // Get amount and currency from request

  try {
      const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'], // Specify payment method types
          line_items: [
              {
                  price_data: {
                      currency: currency,
                      product_data: {
                          name: 'Your Product Name', // Replace with actual product name
                      },
                      unit_amount: amount, // Amount should be in smallest currency unit (e.g., cents)
                  },
                  quantity: 1, // Adjust quantity as necessary
              },
          ],
          mode: 'payment',
          success_url: 'http://localhost:3000/success', // Redirect URL on success
          cancel_url: 'http://localhost:3000/cancel', // Redirect URL on cancellation
      });

      res.json({ id: session.id }); // Send session ID back to the client
  } catch (error) {
      res.status(500).send({ error: error.message });
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// API endpoint to delete all items associated with a username
app.delete('/api/deleteUserItems', (req, res) => {
  // Read existing data from the JSON file
  fs.readFile(DATA_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Error reading file' });
    }

    let globalData = {};
    try {
      globalData = JSON.parse(data); // Parse the JSON data
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing JSON' });
    }

    const username = globalData.username || 'vamsi'; // Default to 'vamsi' if not in JSON

    // SQL query to delete items associated with the username
    const sql = 'DELETE FROM newlist WHERE username = ?';
    db.query(sql, [username], (err, result) => {
      if (err) {
        console.error('Error deleting user items:', err);
        return res.status(500).json({ message: 'Error deleting user items' });
      }

      res.status(200).json({ message: 'User items deleted successfully' });
    });
  });
});

