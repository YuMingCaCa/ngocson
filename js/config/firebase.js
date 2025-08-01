// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, Timestamp, orderBy, doc, setDoc, onSnapshot, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDosCykP-rrTVAlwfAOXDGgGioxtt-VrOs",
  authDomain: "quanlykinhdoanh-cb2b1.firebaseapp.com",
  projectId: "quanlykinhdoanh-cb2b1",
  storageBucket: "quanlykinhdoanh-cb2b1.firebasestorage.app",
  messagingSenderId: "478736931655",
  appId: "1:478736931655:web:b216ac919d9aeca334ca62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase và Firestore đã được khởi tạo!");

// Export the database instance and all the functions we need
export { db, collection, addDoc, query, where, getDocs, getDoc, Timestamp, orderBy, doc, setDoc, onSnapshot, deleteDoc, updateDoc };
