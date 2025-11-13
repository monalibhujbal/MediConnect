import { type NextRequest, NextResponse } from "next/server"
import { users } from "@/app/api/data-store"

// This would connect to your MongoDB database
// For now, using mock data
const mockUsers = [
  {
    id: "1",
    name: "John Patient",
    email: "patient@test.com",
    password: "password123",
    role: "patient",
  },
  {
    id: "2",
    name: "Dr. Jane Smith",
    email: "doctor@test.com",
    password: "password123",
    role: "physician",
    licenseNumber: "MD123456",
    specialization: "Cardiology",
  },
  {
    id: "3",
    name: "Mary Receptionist",
    email: "receptionist@test.com",
    password: "password123",
    role: "receptionist",
  },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString("base64")

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
