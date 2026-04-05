import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJoQJ3smoSuz5QGdWW5tbtneMWrrprw4s",
  authDomain: "school-app-firebase-ecc4f.firebaseapp.com",
  projectId: "school-app-firebase-ecc4f",
  storageBucket: "school-app-firebase-ecc4f.appspot.com",
  messagingSenderId: "755652473571",
  appId: "1:755652473571:web:cce8b6a2ae92a31aa34bd6",
  measurementId: "G-1BS2JCRNZ0"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, onAuthStateChanged};
