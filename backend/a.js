// sendEmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vamsipraneeth2004@gmail.com',  // Your email address
        pass: 'mnux xved beeu rmso',   // Your password or app password
    },
});

// Email data
const mailOptions = {
    from: process.env.EMAIL_USER,
    
    to: 'mrvirtuoso31@gmail.com', // Replace with the recipient's email address
    subject: 'Test Email from Nodemailer',
    text: 'This is a test email sent from a simple Node.js script using Nodemailer!',
};

// Send email
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.error('Error sending email:', error);
    }
    console.log('Email sent:', info.response);
});
