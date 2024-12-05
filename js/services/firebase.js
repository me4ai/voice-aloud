// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js';
import { 
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-auth.js';
import { 
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    listAll,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-storage.js';
import { 
    getFirestore,
    collection,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js';

import CONFIG from '../config.js';

class FirebaseService {
    constructor() {
        // Initialize Firebase
        this.app = initializeApp(CONFIG.FIREBASE);
        this.auth = getAuth(this.app);
        this.storage = getStorage(this.app);
        this.db = getFirestore(this.app);
        
        // Auth providers
        this.googleProvider = new GoogleAuthProvider();
        this.githubProvider = new GithubAuthProvider();
        
        // Current user
        this.currentUser = null;
        
        // Initialize auth state listener
        this.initAuthStateListener();
    }

    // Auth State Management
    initAuthStateListener() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            if (user) {
                this.onUserSignedIn(user);
            } else {
                this.onUserSignedOut();
            }
        });
    }

    onUserSignedIn(user) {
        // Update user data in Firestore
        const userRef = collection(this.db, 'users');
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            lastLogin: new Date().toISOString()
        };
        
        addDoc(userRef, userData)
            .catch(error => console.error('Error updating user data:', error));
    }

    onUserSignedOut() {
        // Clear local user data
        localStorage.removeItem(CONFIG.STORAGE.KEYS.USER_DATA);
    }

    // Authentication Methods
    async signInWithEmail(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    async signUpWithEmail(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            if (displayName) {
                await updateProfile(userCredential.user, { displayName });
            }
            return userCredential.user;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            return result.user;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    async signInWithGithub() {
        try {
            const result = await signInWithPopup(this.auth, this.githubProvider);
            return result.user;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    async signOutUser() {
        try {
            await signOut(this.auth);
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    // Storage Methods
    async uploadRecording(file, metadata = {}) {
        if (!this.currentUser) throw new Error('User not authenticated');
        
        try {
            const fileName = `recordings/${this.currentUser.uid}/${new Date().getTime()}_${file.name}`;
            const storageRef = ref(this.storage, fileName);
            
            // Upload file
            const snapshot = await uploadBytes(storageRef, file, metadata);
            
            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Save recording metadata to Firestore
            const recordingData = {
                userId: this.currentUser.uid,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                downloadURL,
                createdAt: new Date().toISOString(),
                ...metadata
            };
            
            await addDoc(collection(this.db, 'recordings'), recordingData);
            
            return downloadURL;
        } catch (error) {
            console.error('Error uploading recording:', error);
            throw error;
        }
    }

    async getUserRecordings() {
        if (!this.currentUser) throw new Error('User not authenticated');
        
        try {
            const q = query(
                collection(this.db, 'recordings'),
                where('userId', '==', this.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching recordings:', error);
            throw error;
        }
    }

    async deleteRecording(recordingId) {
        if (!this.currentUser) throw new Error('User not authenticated');
        
        try {
            // Get recording data
            const recordingRef = doc(this.db, 'recordings', recordingId);
            const recordingDoc = await getDoc(recordingRef);
            
            if (!recordingDoc.exists()) {
                throw new Error('Recording not found');
            }
            
            const recordingData = recordingDoc.data();
            
            // Check ownership
            if (recordingData.userId !== this.currentUser.uid) {
                throw new Error('Unauthorized access');
            }
            
            // Delete from Storage
            const storageRef = ref(this.storage, recordingData.downloadURL);
            await deleteObject(storageRef);
            
            // Delete from Firestore
            await deleteDoc(recordingRef);
        } catch (error) {
            console.error('Error deleting recording:', error);
            throw error;
        }
    }

    // Error Handling
    handleAuthError(error) {
        console.error('Auth error:', error);
        
        const errorMessages = {
            'auth/user-not-found': 'No user found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'Email address is already registered.',
            'auth/invalid-email': 'Invalid email address format.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
            'auth/cancelled-popup-request': 'Another sign-in popup is already open.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
        };
        
        return new Error(errorMessages[error.code] || error.message);
    }
}

// Create and export Firebase service instance
const firebaseService = new FirebaseService();
export default firebaseService;
