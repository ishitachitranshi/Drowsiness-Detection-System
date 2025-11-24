'use client'; 

import React, { useState, useEffect, useRef } from 'react';
// 💥 FIX: Ensure correct DocumentSnapshot import structure
import { getFirestore, doc, onSnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore'; 
import { initializeApp, FirebaseApp } from 'firebase/app';

// 🆕 Declare the global variable for TypeScript
declare const __firebase_config: string | undefined;

// Define the type structure for our settings
interface AdminSettings extends DocumentData {
  sound_enabled: boolean;
  sound_tone: string;
  email_enabled?: boolean; // Optional, as it might be missing initially
  emergency_email?: string; // Optional
}

// Assume __firebase_config is globally available (needs to be configured once globally)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Initialize Firebase 
const app: FirebaseApp | null = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

// API Endpoints
const VIDEO_FEED_URL = 'http://localhost:5000/video_feed';
const STATUS_API_URL = 'http://localhost:5000/status';
const SETTINGS_DOC_PATH = "user_settings/admin_config"; 

// Default settings used if Firestore fails
const defaultSettings: AdminSettings = {
  sound_enabled: true,
  sound_tone: "siren",
  email_enabled: false,
  emergency_email: "",
};

export default function Home() {
  const [status, setStatus] = useState<string>('System Ready (Connecting to Backend)');
  const [isDrowsy, setIsDrowsy] = useState<boolean>(false);
  const [earValue, setEarValue] = useState<number | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings); 
  const audioRef = useRef<HTMLAudioElement>(null);

  // 1. Fetch Drowsiness Status from Backend (Polling)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(STATUS_API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();

        // Check if drowsiness status has changed
        if (data.is_drowsy !== isDrowsy) {
            setIsDrowsy(data.is_drowsy);
        }

        setEarValue(data.ear);
        setStatus(data.is_drowsy ? 'Drowsiness Detected!🚨' : 'Driver is Alert');

      } catch (error) {
        console.error("Could not fetch status from backend:", error);
        setStatus('Backend Offline/Error');
        setIsDrowsy(false);
        setEarValue(null);
      }
    };

    const intervalId = setInterval(fetchStatus, 500);
    return () => clearInterval(intervalId);
  }, [isDrowsy]); // Depend on isDrowsy to manage audio state

  // 2. Real-time Settings Listener (Firestore Snapshot)
  useEffect(() => {
    if (!db) return;

    const docRef = doc(db, SETTINGS_DOC_PATH);
    
    // FIX APPLIED: The syntax itself is correct for a Document Reference, 
    // but we use a type assertion to guide TypeScript past the overload confusion.
    // In practice, this often resolves the issue by forcing the correct library signature.
    const unsubscribe = onSnapshot(
        docRef as any, // 💥 Type assertion to bypass TypeScript overload confusion 
        (docSnap: DocumentSnapshot<AdminSettings>) => {
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() });
      } else {
        console.warn("Settings document not found. Using defaults.");
        setSettings(defaultSettings);
      }
    }, (error: Error) => { 
      console.error("Error subscribing to settings:", error);
    });

    return () => unsubscribe();
  }, [db]);


  // 3. Audio Playback Handler
  useEffect(() => {
    const audio = audioRef.current;
    
    // Check if sound is enabled in settings AND if drowsiness is detected
    if (isDrowsy && settings.sound_enabled && audio) {
      // Set the audio source dynamically based on settings
      audio.src = `/sounds/${settings.sound_tone}.mp3`;
      audio.loop = true; // Loop the alarm sound
      audio.play().catch(error => console.error("Error playing audio (user interaction required):", error));
    } else if (audio && audio.loop) {
      // Stop and reset when alert is over
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isDrowsy, settings.sound_enabled, settings.sound_tone]);


  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-indigo-800 my-6">Drowsiness Detection System</h1>
      <p className="text-sm text-gray-500 mb-4">
        <a href="/settings" className="text-indigo-600 hover:underline font-medium">
          (Go to Admin Settings)
        </a>
      </p>

      {/* Audio Element (Hidden) */}
      <audio ref={audioRef} preload="auto" />
      
      {/* 2. Video Feed and Drowsiness Display */}
      <div className={`shadow-2xl rounded-xl overflow-hidden border-8 transition-colors duration-500 
                      ${isDrowsy ? 'border-red-600 ring-8 ring-red-300' : 'border-gray-300'}`}>
        {/* The 'src' points to the Python API endpoint */}
        <img 
          src={VIDEO_FEED_URL} 
          alt="Live Video Feed" 
          width="640" 
          height="480" 
          className="block w-full h-auto"
          style={{ display: 'block' }} 
        />
      </div>

      {/* 3. Status Panel */}
      <div 
        className={`mt-6 w-full max-w-xl p-6 rounded-xl shadow-lg transition-all duration-300 
                    ${isDrowsy 
                        ? 'bg-red-700 text-white animate-pulse' 
                        : 'bg-green-100 text-green-800'
                    }`}
      >
        <div className="flex justify-between items-center text-xl font-bold">
            <span>{status}</span>
            <span>{isDrowsy ? '🚨' : '✅'}</span>
        </div>
        <hr className="my-2 border-opacity-30 border-white" />
        <p className="text-sm">EAR Value: {earValue !== null ? earValue.toFixed(2) : 'N/A'}</p>
        <p className="text-sm">Alert Sound: {settings.sound_enabled ? settings.sound_tone.toUpperCase() : 'DISABLED'}</p>
        <p className="text-xs mt-2 italic">
            * Backend Email Alert: {settings.email_enabled ? 'ENABLED' : 'DISABLED'} to {settings.emergency_email || 'No Email Set'}
        </p>
      </div>

    </div>
  );
}