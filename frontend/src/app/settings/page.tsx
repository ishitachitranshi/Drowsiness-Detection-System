'use client'; 

import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, DocumentData, DocumentSnapshot, onSnapshot } from 'firebase/firestore';
import { initializeApp, FirebaseApp } from 'firebase/app';

// 1. TYPING & GLOBAL CONFIG SETUP
declare const __firebase_config: string | undefined;

interface AdminSettings extends DocumentData {
  sound_enabled: boolean;
  sound_tone: string;
  email_enabled: boolean;
  emergency_email: string;
}

// 💥 FIX START: Replace the entire variable declaration below with your actual Firebase configuration.
// Get this JSON object from your Firebase Console -> Project Settings -> Web App Setup.
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC...YOUR_API_KEY...xxxx", // <--- REPLACE THIS
  authDomain: "drowsiness-system-xxxx.firebaseapp.com", // <--- REPLACE THIS
  projectId: "drowsiness-system-xxxx", // <--- REPLACE THIS
  storageBucket: "drowsiness-system-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:234567890:web:abcdef123456",
};
// 💥 FIX END

// Use the hardcoded config for local development
const firebaseConfig = YOUR_FIREBASE_CONFIG; 

// Initialize Firebase (Check if config is available to prevent errors)
const app: FirebaseApp | null = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

// The path to the single settings document in Firestore
const SETTINGS_DOC_PATH = "user_settings/admin_config"; 

// Initializing Default Settings (Type-safe)
const defaultSettings: AdminSettings = {
  email_enabled: false,
  emergency_email: "",
  sound_enabled: true,
  sound_tone: "siren", 
};

// Available sound options for the dropdown
const TONE_OPTIONS = ['siren', 'beep', 'chime', 'bell'];

export default function SettingsDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // 1. Authentication Listener (Handles login/logout state)
  useEffect(() => {
    // 💥 NOTE: Added check for 'app' to ensure initialization succeeded
    if (!auth || !app) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Settings Listener (Fetches and updates settings)
  useEffect(() => {
    if (!db || !authReady || !user) return; // Only run if authenticated and ready

    const docRef = doc(db, SETTINGS_DOC_PATH);
    
    // Use onSnapshot for real-time updates (if another admin changes settings)
    const unsubscribe = onSnapshot(
        docRef as any, // Use type assertion to handle TS overload conflict
        (docSnap: DocumentSnapshot<AdminSettings>) => {
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() });
      } else {
        // If document doesn't exist, initialize it with default values
        setDoc(docRef, defaultSettings).catch(e => console.error("Error setting default settings:", e));
        setSettings(defaultSettings);
      }
    }, (error: Error) => { 
      console.error("Error subscribing to settings:", error);
    });

    return () => unsubscribe();
  }, [db, authReady, user]); // Re-run when DB is ready or user changes

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth) { setError("Firebase not initialized."); return; }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError(`Login failed: ${err.message || 'Check credentials'}`);
    }
  };

  // Handle Settings Save
  const handleSaveSettings = async () => {
    if (!db || !user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, SETTINGS_DOC_PATH);
      await setDoc(docRef, settings as DocumentData); // Type assertion for saving
      alert('Settings saved successfully! Backend will use these instantly.');
    } catch (err) {
      console.error("Error saving settings:", err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogout = () => {
    if (auth) {
      signOut(auth).catch(e => console.error("Logout failed:", e));
    }
  };

  // --- Rendering Functions ---

  const renderLogin = () => (
    <div className="max-w-md mx-auto p-8 bg-white shadow-xl rounded-xl mt-16">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Login</h2>
      <p className="text-sm text-center text-red-500 mb-4">
        *Note: If this is the first login, you must manually create an admin user in your Firebase Console.
      </p>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Login
        </button>
      </form>
    </div>
  );

  const renderDashboard = () => (
    <div className="max-w-3xl mx-auto p-8 bg-white shadow-2xl rounded-xl mt-16">
      <h2 className="text-3xl font-extrabold text-indigo-700 mb-6 border-b pb-3">
        System Alert Configuration
      </h2>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Logged in as Admin ({user?.email})</p>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Logout
        </button>
      </div>

      <div className="space-y-6">
        {/* --- Email Settings --- */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Email Alert Settings (Backend Action)</h3>
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="checkbox"
              checked={settings.email_enabled}
              onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
              className="h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
            <label className="text-base font-medium text-gray-700">Enable Email Alerts on Drowsiness</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Email Address:</label>
            <input
              type="email"
              value={settings.emergency_email}
              onChange={(e) => setSettings({ ...settings, emergency_email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="e.g., fleetmanager@safety.com"
            />
          </div>
        </div>

        {/* --- Sound Settings --- */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Audible Alert Settings (Frontend Action)</h3>
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="checkbox"
              checked={settings.sound_enabled}
              onChange={(e) => setSettings({ ...settings, sound_enabled: e.target.checked })}
              className="h-5 w-5 text-indigo-600 border-gray-300 rounded"
            />
            <label className="text-base font-medium text-gray-700">Enable Audible Alarm in Browser</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alarm Tone:</label>
            <select
              value={settings.sound_tone}  //                   
              onChange={(e) => setSettings({ ...settings, sound_tone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm"
            >
              {TONE_OPTIONS.map(tone => (
                <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Test tone (requires files in /public/sounds):
              <audio controls className="w-full mt-2">
                {/* FIX: Cast e.target to HTMLSourceElement to access the src property */}
                <source 
                  src={`/sounds/${settings.sound_tone}.mp3`} 
                  type="audio/mpeg" 
                  onError={(e) => console.log('Audio file not found or failed to load:', (e.target as HTMLSourceElement).src)}
                />
                Your browser does not support the audio element.
              </audio>
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSaveSettings}
        disabled={isSaving}
        className={`w-full mt-8 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${
          isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
      >
        {isSaving ? 'Saving...' : 'Save Configuration'}
      </button>
      <p className="mt-4 text-center text-xs text-gray-500">
        *Note: The 'Call' feature requires a paid third-party API (like Twilio) and is not implemented here.
      </p>
    </div>
  );

  if (!authReady || loading) {
    return <div className="min-h-screen bg-gray-100 p-4 text-center pt-20 text-lg">Initializing security components...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {user ? renderDashboard() : renderLogin()}
    </div>
  );
}