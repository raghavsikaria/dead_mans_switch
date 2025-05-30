"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TechStackSection from "@/components/TechStackSection"
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import axios from "axios"

interface StatusData {
  threshold: number
  lastCheckIn: string
  nextAlertTime: string
}

const Loader = () => (
  <div className="flex items-center justify-center mt-4">
    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  </div>
)

function formatDateWithOrdinalAndTime(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();

  const getOrdinal = (n: number) => {
    if (n >= 11 && n <= 13) return `${n}th`;
    const lastDigit = n % 10;
    switch (lastDigit) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  };

  const dayWithOrdinal = getOrdinal(day);
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dayWithOrdinal} ${month} ${year}, ${time}`;
}


export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [threshold, setThreshold] = useState("")
  const [emails, setEmails] = useState("")
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sessionStorage.clear()
    signOut(auth)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setLoading(true)
        const token = await firebaseUser.getIdToken()

        const user_id = firebaseUser.uid

        // Step 1: Check-in
        await axios.post("https://us0kzq5ltk.execute-api.us-east-1.amazonaws.com", {
          mode: "checkin",
          user_id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })

        // Step 2: Fetch config
        const response = await axios.post("https://us0kzq5ltk.execute-api.us-east-1.amazonaws.com", {
          mode: "fetch",
          user_id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const item = response.data
        console.log("Fetched config:", item)
        if (item) {
          const thresholdHours = item.threshold_hours
          const lastCheckIn = item.last_checkin_time
          const contacts = item.contact_emails

          const nextAlertTime = new Date(new Date(lastCheckIn).getTime() + thresholdHours * 60 * 60 * 1000)

          setThreshold(String(thresholdHours))
          setEmails((contacts || []).join(", "))
          setStatus({
            threshold: thresholdHours,
            lastCheckIn,
            nextAlertTime: nextAlertTime.toISOString()
          })
        }

        setLoading(false)
      } else {
        setUser(null)
        setThreshold("")
        setEmails("")
        setStatus(null)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const handleSave = async () => {
    if (!user) return alert("User is not signed in.")

    const parsedThreshold = Number(threshold)
  
    if (
      isNaN(parsedThreshold) ||
      parsedThreshold < 20 ||
      parsedThreshold > 480
    ) {
      return alert("Threshold must be a number between 20 and 480 hours.")
    }

    const emailList = emails.split(",").map(e => e.trim()).filter(e => e.length > 0)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailList.filter(email => !emailRegex.test(email))

    if (emailList.length === 0) {
      return alert("At least one valid contact email is required.")
    }

    if (invalidEmails.length > 0) {
      return alert(`Invalid email(s): ${invalidEmails.join(", ")}`)
    }

    const token = await user.getIdToken()

    setLoading(true)

    await axios.post("https://us0kzq5ltk.execute-api.us-east-1.amazonaws.com", {
      user_id: user.uid,
      threshold_hours: parsedThreshold,
      contact_emails: emailList
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    alert("Configuration saved!")

    const response = await axios.post("https://us0kzq5ltk.execute-api.us-east-1.amazonaws.com", {
      mode: "fetch",
      user_id: user.uid
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const item = response.data
    if (item) {
      const thresholdHours = item.threshold_hours
      const lastCheckIn = item.last_checkin_time
      const contacts = item.contact_emails

      const nextAlertTime = new Date(new Date(lastCheckIn).getTime() + thresholdHours * 60 * 60 * 1000)

      setThreshold(String(thresholdHours))
      setEmails((contacts || []).join(", "))
      setStatus({
        threshold: thresholdHours,
        lastCheckIn,
        nextAlertTime: nextAlertTime.toISOString()
      })
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    if (!user) return

    const token = await user.getIdToken()
    await axios.post("https://us0kzq5ltk.execute-api.us-east-1.amazonaws.com", {
      mode: "delete",
      user_id: user.uid
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    alert("Account deleted.")
    await signOut(auth)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-xl text-center px-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
        <span className="block">Welcome to</span>
        <span className="block whitespace-nowrap">Dead Man&apos;s Switch</span>
      </h1>
        <p className="mb-6 text-gray-600 text-pretty text-balance">
          A safety tool that checks in on you. If you don’t check in within a configured timeframe,
          it automatically sends alert emails to your selected contacts.
        </p>
      </div>
  
      {loading && <Loader />}
  
      {!user && (
        <Button onClick={handleGoogleSignIn} className="mt-4">
          Sign in with Google / Check In
        </Button>
      )}
  
      {user && (
        <Card className="w-full max-w-md mt-6">
          <CardContent className="flex flex-col gap-4 py-6">
            <div>
              <Label>Threshold Time (in hours)</Label>
              <Input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div>
              <Label>Contact Email(s)</Label>
              <Input
                placeholder="Separate multiple with commas"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete My Account
            </Button>
  
            {status && (
              <div className="mt-4 rounded-md border bg-muted/50 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 shadow-sm space-y-3 sm:space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-gray-500 whitespace-nowrap">⏱️ <strong>Threshold:</strong></span>
                  <span>{status.threshold} hours</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-green-600 whitespace-nowrap">✅ <strong>Last Check-In:</strong></span>
                  <span>{formatDateWithOrdinalAndTime(status.lastCheckIn)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-red-600 whitespace-nowrap">🚨 <strong>Next Alert Time:</strong></span>
                  <span>{formatDateWithOrdinalAndTime(status.nextAlertTime)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
  
      <div className="mt-8 w-full px-4">
        <TechStackSection />
      </div>
    </main>
  )
}
