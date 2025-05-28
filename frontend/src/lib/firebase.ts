import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCXQw4RZq1rJjdLhP9LUCnH0dWMybYibqc",
  authDomain: "deadmans-switch-f8d02.firebaseapp.com",
  projectId: "deadmans-switch-f8d02",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)