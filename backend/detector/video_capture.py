import cv2
import mediapipe as mp
import numpy as np
import imutils
from imutils import face_utils

LEFT_EYE_LANDMARKS = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_LANDMARKS = [362, 385, 387, 263, 373, 380]

def video_stream():
    """Initializes and returns a video stream object."""
    class VideoStream:
        def __init__(self):
            self.vs = cv2.VideoCapture(0)
            if not self.vs.isOpened():
                print("Error: Could not open video stream.")
                exit()
        
        def read_frame(self):
            ret, frame = self.vs.read()
            if not ret:
                return None
            return imutils.resize(frame, width=450)

        def process_frame(self, frame, detector, predictor, ear_function):
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = detector.process(rgb_frame)
            ear = None
            shape = None

            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    left_eye_points = np.array([[face_landmarks.landmark[i].x * frame.shape[1], 
                                                 face_landmarks.landmark[i].y * frame.shape[0]] 
                                                for i in LEFT_EYE_LANDMARKS])
                    
                    right_eye_points = np.array([[face_landmarks.landmark[i].x * frame.shape[1], 
                                                  face_landmarks.landmark[i].y * frame.shape[0]] 
                                                 for i in RIGHT_EYE_LANDMARKS])
                    
                    left_ear = ear_function(left_eye_points)
                    right_ear = ear_function(right_eye_points)
                    ear = (left_ear + right_ear) / 2.0
                    
                    shape = left_eye_points # For drawing on the frame if needed
                    break # Process only the first detected face

            return shape, ear

        def cleanup(self):
            self.vs.release()

    return VideoStream()

def face_detector():
    """Initializes and returns a MediaPipe FaceMesh object."""
    mp_face_mesh = mp.solutions.face_mesh
    return mp_face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5)

def landmark_predictor():
    """A placeholder to maintain the old structure but not used with MediaPipe."""
    return None