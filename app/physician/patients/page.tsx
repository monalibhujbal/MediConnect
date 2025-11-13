"use client"

import { useEffect, useState } from "react"
import { PhysicianNav } from "@/components/physician-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Clock, User, Calendar, FileText, CheckCircle } from "lucide-react"

interface Appointment {
  id: string
  patientId: string
  patientName: string
  date: string
  time: string
  status: "pending" | "confirmed" | "completed"
  followUpDate?: string | null
}

export default function PhysicianPatientsPage() {
  const [user, setUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [followUpDates, setFollowUpDates] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      window.location.href = "/physician/login"
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchAppointments(parsedUser.id, selectedDate)
  }, [selectedDate])

  const fetchAppointments = async (physicianId: string, date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments?physicianId=${physicianId}&t=${Date.now()}`, { cache: "no-store" })
      const data = await res.json()

      const todayAppointments = data.filter(
        (apt: any) =>
          apt.physicianId === physicianId &&
          apt.date === date &&
          (apt.status === "confirmed" || apt.status === "completed")
      )

      setAppointments(todayAppointments)
    } catch (error) {
      console.error("Error fetching patients:", error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkCompleted = async (appointmentId: string) => {
    const followUpDate = followUpDates[appointmentId] || null
    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status: "completed", followUpDate }),
      })

      if (res.ok) {
        alert("✅ Appointment marked as completed!")
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, status: "completed", followUpDate } : a
          )
        )
      } else {
        alert("Failed to update appointment.")
      }
    } catch (error) {
      console.error("Error updating appointment:", error)
      alert("Server error.")
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <PhysicianNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">My Patients</h1>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>

          {loading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading...</Card>
          ) : appointments.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No patients found for the selected date.
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {appointments.map((apt) => (
                <Card key={apt.id} className="p-6 border-l-4 border-l-primary space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <User className="w-5 h-5" />
                      {apt.patientName}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" /> {apt.time}
                    <Calendar className="w-4 h-4" /> {apt.date}
                  </div>

                  {/* ✅ Follow-up Date Input */}
                  {apt.status !== "completed" && (
                    <div className="mt-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        Follow-up Date (optional):
                      </label>
                      <input
                        type="date"
                        value={followUpDates[apt.id] || ""}
                        onChange={(e) =>
                          setFollowUpDates((prev) => ({
                            ...prev,
                            [apt.id]: e.target.value,
                          }))
                        }
                        className="px-3 py-2 mt-1 border border-input rounded-md w-full bg-background"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/physician/patient-details/${apt.patientId}`}>
                        <FileText className="w-4 h-4 mr-1" />
                        View Records
                      </Link>
                    </Button>

                    {apt.status !== "completed" ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkCompleted(apt.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Completed
                      </Button>
                    ) : (
                      <span className="text-sm text-green-700 italic">
                        Follow-up:{" "}
                        {apt.followUpDate ? apt.followUpDate : "No follow-up set"}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
