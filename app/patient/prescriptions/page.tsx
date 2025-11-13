"use client"

import { useEffect, useState } from "react"
import { PatientNav } from "@/components/patient-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pill, Download, Calendar } from "lucide-react"

interface Prescription {
  id: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  issuedDate: string
  physician: string
  status: "active" | "expired" | "completed"
}

export default function PrescriptionsPage() {
  const [user, setUser] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    {
      id: "1",
      medication: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "30 days",
      issuedDate: "2025-01-15",
      physician: "Dr. Jane Smith",
      status: "active",
    },
    {
      id: "2",
      medication: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      duration: "60 days",
      issuedDate: "2025-01-10",
      physician: "Dr. Jane Smith",
      status: "active",
    },
    {
      id: "3",
      medication: "Amoxicillin",
      dosage: "250mg",
      frequency: "Three times daily",
      duration: "7 days",
      issuedDate: "2025-01-01",
      physician: "Dr. John Doe",
      status: "completed",
    },
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  if (!user) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "expired":
        return "bg-red-100 text-red-800"
      default:
        return ""
    }
  }

  const activePrescriptions = prescriptions.filter((p) => p.status === "active")
  const pastPrescriptions = prescriptions.filter((p) => p.status !== "active")

  return (
    <div className="min-h-screen bg-background">
      <PatientNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Pill className="w-8 h-8" />
              Your Prescriptions
            </h1>
            <p className="text-muted-foreground">View and manage your active and past prescriptions</p>
          </div>

          {/* Active Prescriptions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Active Prescriptions ({activePrescriptions.length})</h2>
            {activePrescriptions.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active prescriptions</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activePrescriptions.map((prescription) => (
                  <Card key={prescription.id} className="p-6 border-l-4 border-l-green-500">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{prescription.medication}</h3>
                          <p className="text-sm text-muted-foreground">{prescription.physician}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(prescription.status)}`}
                        >
                          {prescription.status}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Dosage</p>
                          <p className="font-semibold">{prescription.dosage}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Frequency</p>
                          <p className="font-semibold">{prescription.frequency}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-semibold">{prescription.duration}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Issued
                          </p>
                          <p className="font-semibold">{prescription.issuedDate}</p>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Download className="w-4 h-4" />
                        Download Prescription
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past Prescriptions */}
          {pastPrescriptions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Past Prescriptions ({pastPrescriptions.length})</h2>
              <div className="space-y-3">
                {pastPrescriptions.map((prescription) => (
                  <Card key={prescription.id} className="p-6 opacity-75">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{prescription.medication}</h3>
                        <p className="text-sm text-muted-foreground">
                          {prescription.dosage} - {prescription.physician}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(prescription.status)}`}
                      >
                        {prescription.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
