// Import Firebase SDK modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-storage.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "voiceflow-pro.firebaseapp.com",
    projectId: "voiceflow-pro",
    storageBucket: "voiceflow-pro.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Export Firebase instances
export {
    app,
    auth,
    storage,
    db
};
