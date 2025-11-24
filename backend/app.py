import cv2
import mediapipe as mp
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore
from detector.ear_detector import eye_aspect_ratio
from flask import Flask, Response, jsonify
from flask_cors import CORS
import time 

app = Flask(__name__)
CORS(app) 


cred = credentials.Certificate("firebase-key.json") 
firebase_admin.initialize_app(cred)
db = firestore.client()

EYE_AR_THRESH = 0.29 
EYE_AR_CONSEC_FRAMES = 15
COUNTER = 0
ALARM_ON = False
DROWSINESS_STATUS = {"is_drowsy": False, "ear": 1.0} 

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5)

LEFT_EYE_LANDMARKS = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_LANDMARKS = [362, 385, 387, 263, 373, 380]

vs = cv2.VideoCapture(0)

def log_drowsiness_event():
    """Logs a drowsiness event to the Firestore database."""
    doc_ref = db.collection('drowsiness_events').document()
    doc_ref.set({
        'timestamp': firestore.SERVER_TIMESTAMP,
        'status': 'drowsy'
    })
    print("[LOG] Drowsiness event logged to Firestore.")

def generate_frames():
    """Reads video frames, performs detection, and yields MJPEG stream."""
    global COUNTER, ALARM_ON, DROWSINESS_STATUS
    
    if not vs.isOpened():
        print("Error: Could not open video stream.")
        return

    prev_time = time.time()
    
    while True:
        ret, frame = vs.read()
        if not ret:
            break

        current_time = time.time()
        fps = 1 / (current_time - prev_time)
        prev_time = current_time
        
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        ear = 1.0 
        
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                left_eye_points = np.array([[face_landmarks.landmark[i].x * frame.shape[1], 
                                             face_landmarks.landmark[i].y * frame.shape[0]] 
                                            for i in LEFT_EYE_LANDMARKS])
                
                right_eye_points = np.array([[face_landmarks.landmark[i].x * frame.shape[1], 
                                              face_landmarks.landmark[i].y * frame.shape[0]] 
                                             for i in RIGHT_EYE_LANDMARKS])

                left_ear = eye_aspect_ratio(left_eye_points)
                right_ear = eye_aspect_ratio(right_eye_points)
                ear = (left_ear + right_ear) / 2.0
                
                # --- (Drowsiness Logic) ---
                if ear < EYE_AR_THRESH:
                    COUNTER += 1
                    if COUNTER >= EYE_AR_CONSEC_FRAMES:
                        if not ALARM_ON:
                            ALARM_ON = True
                            log_drowsiness_event()
                        cv2.putText(frame, "DROWSINESS ALERT!", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                        
                        DROWSINESS_STATUS = {"is_drowsy": True, "ear": round(ear, 2)} 
                else:
                    COUNTER = 0
                    ALARM_ON = False
                    
                    DROWSINESS_STATUS = {"is_drowsy": False, "ear": round(ear, 2)} 
                
                cv2.putText(frame, f"EAR: {ear:.2f}", (300, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                cv2.putText(frame, f"FPS: {int(fps)}", (frame.shape[1] - 100, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)


        # Encode the frame as JPEG for streaming
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        # Yield the frame in an MJPEG format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# --- FLASK ENDPOINTS ---

@app.route('/video_feed')
def video_feed():
    """Returns the live video stream response."""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status():
    """Returns the current drowsiness status as JSON."""
    return jsonify(DROWSINESS_STATUS)

# --- START THE FLASK APP ---
if __name__ == '__main__':
    print("[INFO] Starting Flask server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)

vs.release()
face_mesh.close()
