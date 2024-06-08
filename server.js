const express = require('express');
const session = require('express-session'); 
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');  
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/script-signup.js', function(req, res) {
  res.set('Content-Type', 'application/javascript');
  res.sendFile(__dirname + '/public/script-signup.js');
});


const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Harshitha@123',
  database: 'project',
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sriharshithabalineni@gmail.com',
    pass: 'stqx gbqx ajtq rigf'
  }
});


app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));
function generateToken() { //not using this
  return Math.random().toString(36).substr(2, 10);
}

async function generateVerificationToken() {
  const randomBytes = await crypto.randomBytes(32);
  return randomBytes.toString('hex');
}

async function sendVerificationEmail(email, token) {
  const mailOptions = {
    from: 'sriharshithabalineni@gmail.com',
    to: email,
    subject: 'Email Verification',
    text: `Click the following link to verify your email: http://localhost:3000/verify?token=${token}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending verification email: ' + error.message);
      return;
    }
    console.log('Verification email sent: ' + info.response);
  });
}

app.post('/signup', async (req, res) => {
  const { username, email, password, role } = req.body; 

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = await generateVerificationToken();

    const [results] = await pool.execute('INSERT INTO user (username, email, password, role, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?)', [username, email, hashedPassword, role, verificationToken, false]);
    console.log('New user added with ID ' + results.insertId);

    const verificationLink = `http://localhost:3000/verify?token=${verificationToken}`;
    await sendVerificationEmail(email, verificationToken);

    res.json({ message: 'Signup successful! Please verify your email to proceed.' });
  } catch (error) {
    console.error('Error inserting new user: ' + error.message);
    res.status(500).json({ error: 'Error creating user. Please try again later.' });
  }
});

app.get('/verify', async (req, res) => {
  const token = req.query.token;

  try {
    const [rows] = await pool.execute('SELECT * FROM user WHERE verification_token = ?', [token]);

    if (rows.length === 0) {
      console.log('Invalid verification token:', token);
      return res.status(400).send('Invalid verification token.');
    }

    const user = rows[0];

    await pool.execute('UPDATE user SET is_verified = TRUE WHERE id = ?', [user.id]);

    res.send('Email verified successfully!');
  } catch (err) {
    console.error('Error verifying email:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.execute('SELECT * FROM user WHERE username = ?', [username]);
    if (rows.length === 0) {
      console.log('User not found');
      return res.status(401).send('Invalid username or password');
    }

    const user = rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password');
      return res.status(401).send('Invalid username or password');
    }

    req.session.role = user.role; // Setting user role in session upon successful login
    
    req.session.username = username; // Storing username in session

    switch (user.role) {
      case 'patient':
        res.redirect('/patient.html');
        break;
      case 'admin':
        res.redirect('/admin.html');
        break;
      case 'doctor':
        res.redirect('/doctors.html');
        break;
      default:
        res.status(403).send('Unauthorized access');
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Internal Server Error');
  }
});

function checkRole(role) {
  return function (req, res, next) {
    if (req.session && req.session.role === role) {
      next();
    } else {
      res.status(403).send('Unauthorized access');
    }
  };
}

app.get('/patient.html', checkRole('patient'), (req, res) => {
  res.sendFile(__dirname + '/patient.html');
});

app.get('/admin.html', checkRole('admin'), (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

app.get('/doctors.html', checkRole('doctor'), (req, res) => {
  res.sendFile(__dirname + '/doctors.html');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/login.html', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.get('/signup.html', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
});

app.get('/blogs.html', (req, res) => {
  res.sendFile(__dirname + '/blogs.html');
});

app.get('/update-time.html', (req, res) => {
  res.sendFile(__dirname + '/update-time.html');
});


// to add doctors
app.post('/update-info', async (req, res) => {
  const newName = req.body.name;
  const newStartTime = req.body.startTime; // Updated to newStartTime
  const newEndTime = req.body.endTime; // New field for end time
  const newDepartment = req.body.department;

  try {
    // Check if doctor already exists
    const checkQuery = 'SELECT name FROM doctors WHERE name = ?';
    const [checkResult] = await pool.execute(checkQuery, [newName]);

    if (checkResult.length === 0) {
      // Doctor not found, insert new entry
      const insertQuery = 'INSERT INTO doctors (name, start_time, end_time, department) VALUES (?, ?, ?, ?)'; // Updated to include end_time
      await pool.execute(insertQuery, [newName, newStartTime, newEndTime, newDepartment]);
      console.log('New doctor added successfully');
      res.send('Doctor information added successfully');
    } else {
      // Doctor found, update information
      const updateQuery = 'UPDATE doctors SET start_time = ?, end_time = ?, department = ? WHERE name = ?'; // Updated to include end_time
      const [results] = await pool.execute(updateQuery, [newStartTime, newEndTime, newDepartment, newName]);

      console.log('UPDATE query result:', results);

      if (results.affectedRows === 0) {
        throw new Error('No rows updated');
      }

      console.log('Information updated successfully');
      res.send('Information updated successfully');
    }
  } catch (error) {
    console.error('Error updating information: ' + error.message);
    res.status(500).json({ error: 'Error updating information. Please try again later.' });
  }
});

// Endpoint to book an appointment
app.post('/Book-Appointment', async (req, res) => {
  try {
    // Extract appointment data from the request body
    const { name, email, age, gender, department, chief_complaint } = req.body;

    // Insert appointment data into patients table
    const [result] = await pool.execute('INSERT INTO patients (name, email, age, gender, department, chief_complaint) VALUES (?, ?, ?, ?, ?, ?)', [name, email, age, gender, department, chief_complaint || null]);

    // Handle successful insertion
    console.log('Appointment booked successfully for:', name);
    res.json({ message: 'Appointment booked successfully' });
  } catch (error) {
    console.error('Error inserting patient data:', error);
    res.status(500).json({ error: 'Error booking appointment' });
  }
});


app.get('/Book-appointment.html', (req, res) => {
  res.sendFile(__dirname + '/book-appointment.html');
});
app.get('/update-patient-record.html', (req, res) => {
  res.sendFile(__dirname + '//update-patient-record.html');
});
app.get('/view-report.html', (req, res) => {
  res.sendFile(__dirname + '/view-report.html');
});
app.get('/Edit-Employee.html', (req, res) => {
  res.sendFile(__dirname + '/Edit-Employee.html');
});
// Fetch Patient Names Endpoint
app.get('/fetch-patients', async (req, res) => { 
  try {
    const [patients] = await pool.execute('SELECT id, name FROM patients');
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Error fetching patients' });
  }
});


// Fetch Individual Patient Information Endpoint
app.get('/fetch-patient/:id', async (req, res) => { //no use
  const patientId = req.params.id;

  try {
    const [patient] = await pool.execute('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (patient.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient[0]);
  } catch (error) {
    console.error('Error fetching patient information:', error);
    res.status(500).json({ error: 'Error fetching patient information' });
  }
});


// Endpoint to handle submission of patient record
app.post('/submit-patient-record', async (req, res) => {
  try {
    // Extract data from the request body
    const { name, medicines, suggestions } = req.body;

    // Check if all required fields are present
    if (!name || !medicines || !suggestions) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    // Insert the patient record into the database
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO update_patient_record (patient_name, medicines, suggestions) VALUES (?, ?, ?)',
      [name, medicines, suggestions]
    );
    connection.release();

    // Send a success response
    res.status(200).json({ message: 'Patient record submitted successfully.' });
  } catch (error) {
    console.error('Error submitting patient record:', error);
    res.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
  }
});

// Body parser middleware to handle incoming request bodies
app.use(bodyParser.json());

// for a particular patient to view report
app.get('/fetch-patients', async (req, res) => {
  const name = req.query.name || ""; 

  try {
    const patient = await Patient.findOne({ name }); 
    if (patient) {
      const { name, suggestions, medicines } = patient; 
      res.json({ name, suggestions, medicines });
    } else {
      res.json({ message: 'Patient not found' });
    }
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Internal server error' }); 
  }
});

app.use(bodyParser.json());

app.get('/view-report', async (req, res) => {
  const username = req.query.username;
  try {
    const reportData = await db.getReportData(username);
    res.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//  endpoint to retrieve username from session
app.get('/api/patientDetails', async (req, res) => {
  const username = req.session.username; // Retrieve username from session
  if (!username) {
    return res.status(400).json({ error: 'Username not found in session' });
  }

  try {
    const patient = await fetchPatientDetails(username);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient data:', error);
    res.status(500).json({ error: 'Failed to fetch patient data' });
  }
});

async function fetchPatientDetails(username) {
  try {
    const [rows] = await pool.execute('SELECT * FROM update_patient_record WHERE patient_name = ?', [username]);
    if (rows.length === 0) {
      return null;
    }
    // Assuming you want to return only the first result if any
    return rows[0];
  } catch (error) {
    throw error;
  }
}

// Endpoint to get doctor names
app.get('/get-doctors', async (req, res) => {
  try {
    const [doctors] = await pool.execute('SELECT id, name FROM doctors'); 
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Error fetching doctors' });
  }
});


// Route to add a new doctor
app.post('/add-doctor', (req, res) => {
  const { name, department, start_time, end_time } = req.body;
  const sql = 'INSERT INTO doctors (name, department, start_time, end_time) VALUES (?, ?, ?, ?)';
  pool.execute(sql, [name, department, start_time, end_time], (err, result) => {
    if (err) {
      res.status(500).send('Error adding doctor');
    } else {
      res.status(200).send('Doctor added successfully');
    }
  });
});


app.delete('/delete-doctor', async (req, res) => {
  try {
    const { doctorName } = req.body;

    // Execute the deletion query with a parameterized query
    await pool.execute('DELETE FROM doctors WHERE name = ?', [doctorName]);

    console.log('Doctor deleted successfully from database'); // Log after execution

    res.json({ message: 'Doctor deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Error deleting doctor' });
  }
});



app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`);
});
