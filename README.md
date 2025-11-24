# **🚗 Real-Time Drowsiness Detection System**

This project implements a robust, real-time driver drowsiness detection system using Computer Vision, a Python-based API, and a modern Next.js web interface. The system monitors the driver's eye state and triggers customizable alerts (in-browser audio and external email notifications) upon detecting fatigue.

## **🌟 Key Features**

* **Real-Time Monitoring:** Uses the Eye Aspect Ratio (EAR) method via MediaPipe for high-precision eye tracking.  
* **Hybrid Architecture:** Decouples the detection logic (Python/Flask) from the user interface (Next.js/React).  
* **Customizable Alerts:** Admin dashboard allows configuration of sound alarms and external email notifications.  
* **Secure Administration:** Uses **Firebase Authentication** to protect the settings dashboard.  
* **Cloud Logging:** Drowsiness events are securely logged to **Google Firestore** for auditing and later analysis.  
* **Performance Tracking:** Displays Frames Per Second (FPS) on the video stream to ensure low-latency detection.

## **🛠️ Technology Stack**

| Component | Technology | Role |
| :---- | :---- | :---- |
| **Backend/Core Logic** | Python, Flask | Handles video capture, MediaPipe detection, EAR calculation, and email sending (SMTP). |
| **Computer Vision** | OpenCV, MediaPipe Face Mesh | Provides high-fidelity 468 facial landmark detection for stable eye tracking. |
| **Frontend/UI** | Next.js, React, Tailwind CSS | Provides the main application view and the secure Admin Settings Dashboard. |
| **Database/Auth** | Firebase (Firestore, Auth) | Used for saving admin settings (preferences) and handling user login security. |

## **🚀 Setup and Running the Project**

The system requires two separate terminal windows running concurrently for the backend and frontend.

### **1\. Prerequisites**

* Python 3.8+ (with venv setup)  
* Node.js and npm/yarn  
* Webcam access  
* **Firebase Project:** Must be set up with Firestore and Email/Password Authentication enabled.

### **2\. Backend Setup (Terminal 1\)**

Navigate to the project's root directory (Drowsiness-Detection-System/).

**A. Install Python Dependencies:**

cd backend  
\# Activate your virtual environment (Varies by OS/Shell)  
\# PowerShell: .\\venv\\Scripts\\Activate.ps1  
\# Command Prompt: venv\\Scripts\\activate  
pip install \-r requirements.txt   
\# Ensure you have the Flask and Firebase Admin SDK dependencies installed.

**B. Configuration:**

* **firebase-key.json:** Place your Firebase Admin SDK service account key file in the backend/ directory.  
* **backend/app.py:** **Crucial\!** Update the SENDER\_EMAIL and SENDER\_PASSWORD variables with your actual email credentials and **App Password** (required for security when using Gmail SMTP).

**C. Run the Backend Server:**

python app.py

*(Leave this terminal running. It should start on http://localhost:5000)*

### **3\. Frontend Setup (Terminal 2\)**

Open a **SECOND** terminal and navigate to the frontend directory.

**A. Install Node Dependencies:**

cd frontend  
npm install

**B. Configuration:**

* **frontend/src/app/settings/page.tsx:** **Crucial\!** Replace the placeholder JSON object in the YOUR\_FIREBASE\_CONFIG variable with your actual Firebase Web App configuration credentials (API Key, Project ID, etc.).  
* **Sound Files:** Create a directory named frontend/public/sounds/ and add the required .mp3 files (e.g., siren.mp3, beep.mp3, etc.).

**C. Run the Frontend Server:**

npm run dev

*(Leave this terminal running. It should start on http://localhost:3000)*

## **🖥️ Usage Instructions**

1. **Access the App:** Open your browser to http://localhost:3000. The main page will display the live video feed and detection status.  
2. **Access Admin Panel:** Navigate to **http://localhost:3000/settings**.  
3. **Configure Alerts:** Log in using your Firebase Admin user credentials. From the dashboard, you can:  
   * Enable/Disable **Email Alerts** and set the emergency email address (actioned by the Python Backend).  
   * Enable/Disable **Audible Alarms** and select a tone (actioned by the Next.js Frontend).

## **💡 Project Extensions (Future Work)**

* **Twilio Integration:** Implement the capability to send SMS or make emergency phone calls upon detection (requires a paid API).  
* **Historical Dashboard:** Create a separate Next.js page to query the Firestore drowsiness\_events collection and visualize historical fatigue patterns.  
* **Yawn Detection:** Integrate a secondary model to detect yawning as another physiological indicator of fatigue.