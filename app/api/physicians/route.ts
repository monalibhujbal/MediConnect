import { type NextRequest, NextResponse } from "next/server"
import { getDB, updateDB } from "@/lib/db"

// ✅ GET all physicians or only verified ones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const verifiedOnly = searchParams.get("verified") === "true"

    const db = getDB()
    if (!db.physicians) db.physicians = []

    let physicians = db.physicians

    if (verifiedOnly) {
      physicians = physicians.filter((p: any) => p.verified)
    }

    return NextResponse.json(physicians)
  } catch (error) {
    console.error("GET /physicians error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ✅ Register new physician (pending verification)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const db = updateDB((db) => {
      if (!db.physicians) db.physicians = []

      const newPhysician = {
        id: `phy_${Date.now()}`,
        name: data.name,
        email: data.email,
        specialization: data.specialization,
        experience: data.experience || "Not provided",
        licenseNumber: data.licenseNumber || "N/A",
        verified: false, // 🟡 pending verification
        createdAt: new Date().toISOString(),
      }

      db.physicians.push(newPhysician)
    })

    const newPhysician = db.physicians[db.physicians.length - 1]
    return NextResponse.json(newPhysician)
  } catch (error) {
    console.error("POST /physicians error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ✅ Receptionist verifies physician
export async function PUT(request: NextRequest) {
  try {
    const { physicianId, verified } = await request.json()

    const db = updateDB((db) => {
      const physician = db.physicians.find((p: any) => p.id === physicianId)
      if (physician) {
        physician.verified = verified
        physician.verifiedAt = new Date().toISOString()
      }
    })

    return NextResponse.json({ message: "Physician verification updated successfully" })
  } catch (error) {
    console.error("PUT /physicians error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
