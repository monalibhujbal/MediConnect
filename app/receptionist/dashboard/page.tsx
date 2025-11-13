"use client"

import { useEffect, useState } from "react"
import { ReceptionistNav } from "@/components/receptionist-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Calendar, Users, CheckCircle, AlertCircle, UserCheck } from "lucide-react"

interface Appointment {
  id: string
  patientName: string
  physicianName: string
  date: string
  time: string
  status: "pending" | "confirmed" | "cancelled"
}

interface Physician {
  id: string
  name: string
  specialization: string
  experience: string
  verified: boolean
}

export default function ReceptionistDashboard() {
  const [user, setUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [physicians, setPhysicians] = useState<Physician[]>([])

  // ✅ Fetch receptionist data
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) setUser(JSON.parse(userData))
    fetchAppointments()
    fetchPhysicians()
  }, [])

  // ✅ Fetch appointments
  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/appointments", { cache: "no-store" })
      const data = await res.json()
      setAppointments(data)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    }
  }

  // ✅ Fetch all physicians (verified + unverified)
  const fetchPhysicians = async () => {
    try {
      const res = await fetch("/api/physicians", { cache: "no-store" })
      const data = await res.json()
      setPhysicians(data)
    } catch (error) {
      console.error("Error fetching physicians:", error)
    }
  }

  // ✅ Confirm appointment
  const handleConfirmAppointment = async (id: string) => {
    try {
      await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, status: "confirmed" }),
      })
      fetchAppointments()
      alert("Appointment confirmed successfully!")
    } catch {
      alert("Error confirming appointment.")
    }
  }

  // ✅ Verify physician
  const handleVerifyPhysician = async (physicianId: string) => {
    try {
      await fetch("/api/physicians", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physicianId, verified: true }),
      })
      alert("Physician verified successfully!")
      fetchPhysicians()
    } catch {
      alert("Error verifying physician.")
    }
  }

  if (!user) return null

  // ✅ Stats
  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
  }

  return (
    <div className="min-h-screen bg-background">
      <ReceptionistNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10">
          {/* Welcome Card */}
          <Card className="p-8 bg-gradient-to-r from-primary/10 to-accent/10">
            <h1 className="text-4xl font-bold">Welcome, {user.name}!</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage and track appointments and physician verifications
            </p>
          </Card>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Total Appointments</span>
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold">{stats.total}</p>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Pending</span>
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Confirmed</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold">{stats.confirmed}</p>
            </Card>

            <Link href="/receptionist/appointments">
              <Card className="p-6 space-y-2 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">View All</span>
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <p className="text-3xl font-bold">→</p>
              </Card>
            </Link>
          </div>

          {/* Pending Appointments */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Pending Appointment Confirmations</h2>
            <div className="space-y-3">
              {appointments.filter((apt) => apt.status === "pending").length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No pending appointments at the moment.</p>
                </Card>
              ) : (
                appointments
                  .filter((apt) => apt.status === "pending")
                  .map((apt) => (
                    <Card key={apt.id} className="p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{apt.patientName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Dr. {apt.physicianName} — {apt.date} at {apt.time}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleConfirmAppointment(apt.id)}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirm
                      </Button>
                    </Card>
                  ))
              )}
            </div>
          </div>

          {/* 🩺 Pending Physician Verifications */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Pending Physician Verifications
            </h2>

            <div className="space-y-3">
              {physicians.filter((p) => !p.verified).length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No new physicians pending verification.</p>
                </Card>
              ) : (
                physicians
                  .filter((p) => !p.verified)
                  .map((p) => (
                    <Card key={p.id} className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {p.specialization} — {p.experience}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleVerifyPhysician(p.id)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <UserCheck className="w-4 h-4" />
                        Verify
                      </Button>
                    </Card>
                  ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
