# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh


-- Create staff table
CREATE TABLE staff (
    staff_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    is_first_login BOOLEAN DEFAULT TRUE,
    role varchar(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample staff data with initial password
INSERT INTO staff (email, password, full_name, department) VALUES
('john.doe@nec.edu.in', 'initialpassword123', 'John Doe', 'Computer Science'),
('jane.smith@nec.edu.in', 'initialpassword123', 'Jane Smith', 'Mechanical');



-- Create database for the Hall Booking System
CREATE DATABASE HallBookingSystem;
USE HallBookingSystem;

-- Create Departments table
CREATE TABLE Departments (
    DeptID INT PRIMARY KEY AUTO_INCREMENT,
    DeptName VARCHAR(100) NOT NULL,
    DeptCode VARCHAR(20) UNIQUE NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Halls table
CREATE TABLE Halls (
    HallID INT PRIMARY KEY AUTO_INCREMENT,
    HallName VARCHAR(100) NOT NULL,
    Location VARCHAR(255) NOT NULL,
    Capacity INT NOT NULL,
    HasProjector BOOLEAN DEFAULT FALSE,
    HasAC BOOLEAN DEFAULT FALSE,
    ImageURL VARCHAR(255),
    DeptID INT NOT NULL,
    ActiveStatus BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (DeptID) REFERENCES Departments(DeptID)
);

-- Create Users table for admin access
CREATE TABLE Users (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL, -- Store hashed passwords in production
    Email VARCHAR(100) UNIQUE NOT NULL,
    Role ENUM('admin', 'user') DEFAULT 'user',
    DeptID INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (DeptID) REFERENCES Departments(DeptID)
);

-- Create Bookings table
CREATE TABLE Bookings (
    BookingID INT PRIMARY KEY AUTO_INCREMENT,
    HallID INT NOT NULL,
    UserID INT NOT NULL,
    BookingDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    Purpose VARCHAR(255) NOT NULL,
    Status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (HallID) REFERENCES Halls(HallID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Insert sample departments
INSERT INTO Departments (DeptName, DeptCode) VALUES
('Computer Science', 'CS'),
('Electrical Engineering', 'EE'),
('Mechanical Engineering', 'ME'),
('Civil Engineering', 'CE');

-- Create stored procedure for adding a new hall
DELIMITER //
CREATE PROCEDURE AddHall(
    IN p_HallName VARCHAR(100),
    IN p_Location VARCHAR(255),
    IN p_Capacity INT,
    IN p_HasProjector BOOLEAN,
    IN p_HasAC BOOLEAN,
    IN p_ImageURL VARCHAR(255),
    IN p_DeptID INT,
    OUT p_HallID INT
)
BEGIN
    INSERT INTO Halls (HallName, Location, Capacity, HasProjector, HasAC, ImageURL, DeptID, ActiveStatus)
    VALUES (p_HallName, p_Location, p_Capacity, p_HasProjector, p_HasAC, p_ImageURL, p_DeptID, TRUE);
    
    SET p_HallID = LAST_INSERT_ID();
END //
DELIMITER ;

-- Create stored procedure for updating hall details
DELIMITER //
CREATE PROCEDURE UpdateHall(
    IN p_HallID INT,
    IN p_HallName VARCHAR(100),
    IN p_Location VARCHAR(255),
    IN p_Capacity INT,
    IN p_HasProjector BOOLEAN,
    IN p_HasAC BOOLEAN,
    IN p_ImageURL VARCHAR(255),
    IN p_ActiveStatus BOOLEAN
)
BEGIN
    UPDATE Halls
    SET HallName = p_HallName,
        Location = p_Location,
        Capacity = p_Capacity,
        HasProjector = p_HasProjector,
        HasAC = p_HasAC,
        ImageURL = p_ImageURL,
        ActiveStatus = p_ActiveStatus
    WHERE HallID = p_HallID;
END //
DELIMITER ;

-- Create stored procedure for getting all halls by department
DELIMITER //
CREATE PROCEDURE GetHallsByDepartment(
    IN p_DeptID INT
)
BEGIN
    SELECT h.HallID, h.HallName, h.Location, h.Capacity, h.HasProjector, h.HasAC, 
           h.ImageURL, h.ActiveStatus, d.DeptName
    FROM Halls h
    JOIN Departments d ON h.DeptID = d.DeptID
    WHERE h.DeptID = p_DeptID
    ORDER BY h.HallName;
END //
DELIMITER ;

-- Create stored procedure for toggling hall active status
DELIMITER //
CREATE PROCEDURE ToggleHallStatus(
    IN p_HallID INT,
    IN p_ActiveStatus BOOLEAN
)
BEGIN
    UPDATE Halls
    SET ActiveStatus = p_ActiveStatus
    WHERE HallID = p_HallID;
END //
DELIMITER ;

-- Create view for active halls with department information
CREATE VIEW ActiveHallsView AS
SELECT h.HallID, h.HallName, h.Location, h.Capacity, h.HasProjector, h.HasAC, 
       h.ImageURL, d.DeptName, d.DeptID
FROM Halls h
JOIN Departments d ON h.DeptID = d.DeptID
WHERE h.ActiveStatus = TRUE
ORDER BY d.DeptName, h.HallName;

-- Indexes for better query performance
CREATE INDEX idx_halls_dept ON Halls(DeptID);
CREATE INDEX idx_halls_status ON Halls(ActiveStatus);
CREATE INDEX idx_bookings_hall ON Bookings(HallID);
CREATE INDEX idx_bookings_date ON Bookings(BookingDate);






/*
  # Create Bookings Table

  1. New Tables
    - `bookings`
      - `id` (serial, primary key)
      - `hall_id` (integer, references halls)
      - `hall_name` (text)
      - `staff_name` (text)
      - `staff_email` (text)
      - `staff_phone` (text)
      - `reason` (text)
      - `date` (date)
      - `time_from` (time)
      - `time_to` (time)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Indexes
    - Index on hall_id and date for faster booking conflict checks
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  hall_id INTEGER NOT NULL,
  hall_name TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  staff_email TEXT NOT NULL,
  staff_phone TEXT NOT NULL,
  reason TEXT NOT NULL,
  date DATE NOT NULL,
  time_from TIME NOT NULL,
  time_to TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_hall_date ON bookings(hall_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();




    DELIMITER //

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

DELIMITER ;
