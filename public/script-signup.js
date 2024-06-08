function signup() {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Log a message to indicate that the sign-up button is clicked
  console.log("Sign up button clicked!"); // Get the values of username, email, password, and role from the form

  var username = document.getElementById("username").value;
  var email = document.getElementById("email").value;
  var password = document.getElementById("password").value;
  var role = document.getElementById("role").value; // Log the entered username, email, password, and role for debugging

  console.log("Username:", username);
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("Role:", role); // Check if password and confirm password match

  if (password !== confirm_password) {
    // If passwords do not match, show an error message
    showMessage("Passwords do not match");
    return;
  } // Log a message indicating that the sign-up request is being sent

  console.log("Sending sign-up request..."); // Construct the JSON object containing username, email, password, and role

  var data = {
    username: username,
    email: email,
    password: password,
    role: role,
  }; // Send a POST request to the /signup endpoint on the server

  fetch("/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.text()) // Convert the response to text
    .then((message) => showMessage(message)) // Show the response message
    .catch((error) => console.error("Error:", error)); // Log any errors
}

function showMessage(message) {
  // Log the message to the console
  console.log("Message:", message); // Get the message div element
  var messageDiv = document.getElementById("message"); // Set the inner text of the message div to the received message
  messageDiv.innerText = message;
}
function submitAppointment() {
  // Prevent default form submission
  event.preventDefault(); // Get form data (name, email, age, gender, department, chief complaint)
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const age = document.getElementById("age").value; // Assuming this is a number input
  const gender = document.getElementById("gender").value;
  const department = document.getElementById("department").value;
  const chief_complaint = document.getElementById("chief_complaint").value; // Corrected key here
  console.log("Chief Complaint:", chief_complaint); // Log the value of chief_complaint // Basic validation (optional, can be extended)
  if (!name || !email || !age || !gender || !department || !chief_complaint) {
    // Corrected key here
    alert("Please fill in all required fields.");
    return;
  } // Construct the JSON object containing appointment data
  const jsonData = {
    name,
    email,
    age: parseInt(age), // Convert age to a number if needed
    gender,
    department,
    chief_complaint, 
  }; // Send a POST request to the /Book-Appointment endpoint on the server
  fetch("/Book-Appointment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jsonData),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      alert(data.message); // Display success or error message
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error booking appointment. Please try again later.");
    });
}
// Function to fetch patient names and populate the dropdown
function fetchPatients() {
  fetch("/fetch-patients") // Endpoint to fetch patient names from the server
    .then((response) => response.json())
    .then((data) => {
      const patientsDropdown = document.getElementById("patients");
      patientsDropdown.innerHTML = ""; // Clear existing options

      data.forEach((patient) => {
        const option = document.createElement("option");
        option.value = patient.id; // Assuming patient id is used as value
        option.textContent = patient.name; // Assuming patient name is displayed
        patientsDropdown.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching patients:", error));
}

// Function to fetch patient information based on selected patient
function fetchPatientInfo() {
  const patientId = document.getElementById("patients").value;

  fetch(`/fetch-patient/${patientId}`) // Endpoint to fetch patient info based on id
    .then((response) => response.json())
    .then((data) => {
      const patientInfoDiv = document.getElementById("patientInfo");
      patientInfoDiv.style.display = "block";

      document.getElementById("patientName").textContent = data.name;
      document.getElementById("patientEmail").textContent = data.email;
      document.getElementById("patientAge").textContent = data.age;
      document.getElementById("patientGender").textContent = data.gender;
      document.getElementById("patientDepartment").textContent =
        data.department;
      document.getElementById("patientChiefComplaint").textContent =
        data.chief_complaint;
    })
    .catch((error) => console.error("Error fetching patient info:", error));
}

document.addEventListener("DOMContentLoaded", function () {
  // This code will run after the DOM is fully loaded

  // Find the submit button
  var submitButton = document.getElementById("submitBtn"); // Add event listener for the submit button

  submitButton.addEventListener("click", function () {
    submitPatientRecord();
  });
});

function submitPatientRecord() {
  // Get patient information from the form
  var patientName = document.getElementById("patientName").innerText;
  var medicine = document.getElementById("medicine").value;
  var suggestions = document.getElementById("suggestions").value;

  // Create an object with the patient record data
  var patientRecord = {
    name: patientName,
    medicines: medicine,
    suggestions: suggestions,
  };

  // Send the patient record data to the server
  fetch("/submit-patient-record", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patientRecord),
  })
    .then((response) => {
      if (response.ok) {
        // Show a success message
        alert("Patient record updated successfully!");
      } else {
        // Show an error message if the response is not ok
        alert("Error updating patient record. Please try again.");
      }
    })
    .catch((error) => {
      // Handle any errors
      console.error("Error:", error);
    });
}


fetchPatients();

// Fetch patients when the page loads
document.addEventListener("DOMContentLoaded", () => {
  fetchPatients();
});

document.addEventListener("DOMContentLoaded", function () {
  // This code will run after the DOM is fully loaded

  // Find the submit button and add event listener
  var submitButton = document.getElementById("submitBtn");
  if (submitButton) {
    submitButton.addEventListener("click", submitPatientRecord);
  }

  // Fetch patients
  fetchPatients();
});

function fetchPatients() {
  fetch("/fetch-patients")
    .then((response) => response.json())
    .then((data) => {
      // Check if the patients dropdown exists
      const patientsDropdown = document.getElementById("patients");
      if (!patientsDropdown) {
        console.error("Patients dropdown not found");
        return;
      }

      // Clear existing options
      patientsDropdown.innerHTML = "";

      // Populate dropdown with patient data
      data.forEach((patient) => {
        const option = document.createElement("option");
        option.value = patient.id;
        option.textContent = patient.name;
        patientsDropdown.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching patients:", error));
}
