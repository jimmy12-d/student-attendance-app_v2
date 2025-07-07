import { db } from "@/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const docRef = doc(db, "mockExam3", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return NextResponse.json(docSnap.data());
    } else {
      return NextResponse.json({ error: "No such document!" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error getting document:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 