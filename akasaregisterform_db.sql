-- Create the database
CREATE DATABASE IF NOT EXISTS akasaregisterform_db;

-- Use the newly created database
USE akasaregisterform_db;

-- Create the table with proper formatting and checks
CREATE TABLE IF NOT EXISTS akasastudent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    regno VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    receivedFrom VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    paymentDetails TEXT,
    purpose VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    mode ENUM('upi', 'cash', 'bank') NOT NULL,
    transactionId VARCHAR(100),
    agree TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Select from the table
SELECT * FROM akasastudent;
