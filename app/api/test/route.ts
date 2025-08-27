import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "API is working",
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      message: "POST endpoint working",
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ 
      error: "Invalid JSON",
      message: String(err)
    }, { status: 400 });
  }
}