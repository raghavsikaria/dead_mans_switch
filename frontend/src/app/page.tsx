"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import axios from "axios"

interface StatusData {
  threshold: number
  lastCheckIn: string
  nextAlertTime: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [threshold, setThreshold] = useState("")
  const [emails, setEmails] = useState("")
  const [status, setStatus] = useState<StatusData | null>(null)
  // const [loading, setLoading] = useState(false)

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
    if (!threshold || !emails || !user) {
      return alert("All fields are required.")
    }

    const token = await user.getIdToken()

    await axios.post("https://us0kzq5ltk.execute-api.us-east-1.amazonaws.com", {
      user_id: user.uid,
      threshold_hours: Number(threshold),
      contact_emails: emails.split(",").map(e => e.trim())
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    alert("Configuration saved!")
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
      <h1 className="text-3xl font-bold mb-4">Welcome to Dead Man&apos;s Switch</h1>
      <p className="mb-6 text-gray-600 text-center max-w-xl">
        A safety tool that checks in on you. If you don’t check in within a configured timeframe,
        it automatically sends alert emails to your selected contacts.
      </p>

      {!user && (
        <Button onClick={handleGoogleSignIn}>Sign in with Google / Check In</Button>
      )}

      {user && (
        <Card className="w-full max-w-md">
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
            <Button onClick={handleSave}>Save Settings</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete My Account</Button>

            {status && (
              <div className="text-sm text-gray-700 space-y-1 mt-4">
                <p>⏱️ <strong>Threshold:</strong> {status.threshold} hours</p>
                <p>✅ <strong>Last Check-In:</strong> {new Date(status.lastCheckIn).toLocaleString()}</p>
                <p>🚨 <strong>Next Alert Time:</strong> {new Date(status.nextAlertTime).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-gray-400 mt-6 text-center">
        Built using React, Firebase Auth, AWS Lambda, API Gateway, DynamoDB, SES, and Terraform.
      </div>
    </main>
  )
}
