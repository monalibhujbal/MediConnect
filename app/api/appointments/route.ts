// app/api/appointments/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getDB, updateDB } from "@/lib/db"

/**
 * Helper: parse a date (YYYY-MM-DD) and time ("HH:MM" or "hh:mm AM/PM") into a Date object (local timezone).
 */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null

  // If time includes AM/PM, use that; else assume 24-hour "HH:MM"
  const ampmMatch = timeStr.match(/(am|pm)$/i)
  let hours = 0
  let minutes = 0

  const timeParts = timeStr.trim().split(/[:\s]/).filter(Boolean)

  if (ampmMatch) {
    // e.g. ["09:", "30", "AM"] OR ["9", "30", "AM"]
    // We'll extract numeric parts
    const hh = parseInt(timeParts[0], 10)
    const mm = parseInt(timeParts[1], 10)
    const ampm = (timeParts[2] || timeParts[timeParts.length - 1] || "").toLowerCase()
    hours = hh % 12
    if (ampm === "pm") hours += 12
    minutes = isNaN(mm) ? 0 : mm
  } else {
    // assume "HH:MM" or "H:MM"
    const hh = parseInt(timeStr.split(":")[0], 10)
    const mm = parseInt(timeStr.split(":")[1] || "0", 10)
    hours = isNaN(hh) ? 0 : hh
    minutes = isNaN(mm) ? 0 : mm
  }

  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10))
  if ([y, m, d].some((n) => isNaN(n))) return null

  // JS month is 0-indexed
  return new Date(y, (m || 1) - 1, d, hours, minutes, 0, 0)
}

/**
 * Helper: convert a Date to epoch ms safely
 */
const toMs = (d?: Date | null) => (d ? d.getTime() : 0)

/**
 * Helper: minutes difference between two Date objects (b - a) in minutes
 */
const diffMinutes = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / (1000 * 60))

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")
    const physicianId = searchParams.get("physicianId")
    const date = searchParams.get("date")

    const db = getDB()
    db.appointments = db.appointments || []
    let filtered = db.appointments

    if (patientId) filtered = filtered.filter((a: any) => a.patientId === patientId)
    if (physicianId) filtered = filtered.filter((a: any) => a.physicianId === physicianId)
    if (date) filtered = filtered.filter((a: any) => a.date === date)

    // sort by creation time (latest first) — use getTime() to keep TypeScript happy
    filtered.sort((a: any, b: any) => {
      const at = new Date(a.createdAt || 0).getTime()
      const bt = new Date(b.createdAt || 0).getTime()
      return bt - at
    })

    return new NextResponse(JSON.stringify(filtered), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error) {
    console.error("GET /appointments error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  /*
    Creates a new appointment.
    Prevents:
      - physician slot already taken (existing logic)
      - patient overlapping/duplicate bookings:
          * same date and exact same time (strict)
          * or within a small buffer (e.g., 30 minutes) of an existing pending/confirmed appointment
        (this prevents accidental overlapping bookings)
  */
  try {
    const appointmentData = await request.json()

    const { physicianId, patientId, date, time } = appointmentData

    if (!physicianId || !patientId || !date || !time) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Normalize
    const dbCheck = getDB()
    dbCheck.appointments = dbCheck.appointments || []

    // 1) Physician slot conflict (existing behavior)
    const slotTaken = dbCheck.appointments.find(
      (a: any) =>
        a.physicianId === physicianId &&
        a.date === date &&
        a.time === time &&
        (a.status === "pending" || a.status === "confirmed")
    )
    if (slotTaken) {
      return NextResponse.json(
        { message: "This time slot is already booked for the selected physician." },
        { status: 400 }
      )
    }

    // 2) Prevent overlapping / multiple bookings for the patient
    // We'll prevent:
    //  - any appointment of same patient on same date with same time (exact match)
    //  - any appointment of same patient on same date that is within 30 minutes of desired time
    // Reasonable buffer avoids edge overlapping when slots are 30-min, 15-min, etc.
    const requestedDt = parseDateTime(date, time)
    const bufferMinutes = 30

    const patientConflict = dbCheck.appointments.find((a: any) => {
      if (a.patientId !== patientId) return false
      if (!(a.status === "pending" || a.status === "confirmed")) return false
      if (a.date !== date) return false
      const existingDt = parseDateTime(a.date, a.time)
      if (!requestedDt || !existingDt) {
        // If we can't parse times reliably, fallback to blocking exact time match only
        return a.time === time
      }
      const mins = Math.abs(diffMinutes(existingDt, requestedDt))
      return mins < bufferMinutes // conflict if within buffer
    })

    if (patientConflict) {
      return NextResponse.json(
        { message: "You already have a booking overlapping this time. Please choose another slot." },
        { status: 409 }
      )
    }

    // 3) All good → create appointment and ensure patient record exists (existing behaviour)
    updateDB((db) => {
      db.appointments = db.appointments || []
      db.patients = db.patients || []

      const newAppointment = {
        id: `apt_${Date.now()}`,
        ...appointmentData,
        status: appointmentData.status || "pending",
        paymentStatus: appointmentData.paymentStatus || "paid",
        paymentAmount: appointmentData.paymentAmount || 0, // important for refunds
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.appointments.push(newAppointment)

      // update or create patient record
      const existingPatient = db.patients.find((p: any) => p.id === appointmentData.patientId)
      if (existingPatient) {
        existingPatient.lastVisit = appointmentData.date
        existingPatient.updatedAt = new Date().toISOString()
      } else {
        db.patients.push({
          id: appointmentData.patientId,
          name: appointmentData.patientName || "Unknown Patient",
          age: appointmentData.patientAge || 0,
          bloodType: appointmentData.bloodType || "N/A",
          allergies: appointmentData.allergies || [],
          conditions: appointmentData.conditions || [],
          lastVisit: appointmentData.date,
          createdAt: new Date().toISOString(),
        })
      }
    })

    const newApt = getDB().appointments.slice(-1)[0]
    return NextResponse.json(newApt)
  } catch (error) {
    console.error("POST /appointments error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

/**
 * PUT — update appointment. Extended to:
 *  - mark appointment status (e.g., "completed", "cancelled", "confirmed", "rescheduled")
 *  - support followUpDate field when marking completed
 *  - (cancellation with refund handled via DELETE below to keep semantics clear)
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json()
    const { appointmentId, status, followUpDate } = payload

    if (!appointmentId) {
      return NextResponse.json({ message: "Missing appointmentId" }, { status: 400 })
    }

    updateDB((db) => {
      db.appointments = db.appointments || []
      const apt = db.appointments.find((a: any) => a.id === appointmentId)
      if (apt) {
        if (status) apt.status = status
        if (followUpDate) apt.followUpDate = followUpDate // e.g., "2025-11-20"
        apt.updatedAt = new Date().toISOString()
      }
    })

    return NextResponse.json({ message: "Updated successfully" })
  } catch (error) {
    console.error("PUT /appointments error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

/**
 * DELETE — Cancel an appointment (patient-triggered cancel).
 * Body must include { appointmentId, requestedBy: "patient" } (or similar).
 * Applies refund rules:
 *   - >= 2 hours before appointment start => refund = full paymentAmount
 *   - < 2 hours => refund = 50% of paymentAmount
 * Updates appointment.status = "cancelled", appointment.refund = {...}
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await request.json()
    const { appointmentId, requestedBy } = payload

    if (!appointmentId) {
      return NextResponse.json({ message: "Missing appointmentId" }, { status: 400 })
    }

    const db = getDB()
    db.appointments = db.appointments || []

    const apt = db.appointments.find((a: any) => a.id === appointmentId)
    if (!apt) {
      return NextResponse.json({ message: "Appointment not found" }, { status: 404 })
    }

    // Already cancelled?
    if (apt.status === "cancelled") {
      return NextResponse.json({
        message: "Already cancelled",
        refund: apt.refund?.amount || 0,
      })
    }

    const appointmentDateTime = new Date(`${apt.date}T${apt.time}`)
    const now = new Date()

    const minutesBefore = Math.floor((appointmentDateTime.getTime() - now.getTime()) / 60000)

    const paymentAmount = Number(apt.paymentAmount || 0)
    let refundAmount = 0

    // ✔ CASE 1: More than or equal to 120 minutes before → FULL refund
    if (minutesBefore >= 120) {
      refundAmount = paymentAmount
    }
    // ✔ CASE 2: Between 0 and 119 minutes → 50% refund
    else if (minutesBefore >= 0) {
      refundAmount = paymentAmount * 0.5
    }
    // ✔ CASE 3: Appointment already started → No refund
    else {
      refundAmount = 0
    }

    // Save cancellation + refund record
    updateDB((db) => {
      const a = db.appointments.find((x: any) => x.id === appointmentId)
      if (a) {
        a.status = "cancelled"
        a.refund = {
          amount: Math.round(refundAmount),
          calculatedAt: new Date().toISOString(),
        }
        a.updatedAt = new Date().toISOString()
      }
    })

    return NextResponse.json({
      message: "Appointment cancelled",
      refund: Math.round(refundAmount),
    })
  } catch (error) {
    console.error("DELETE error", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

