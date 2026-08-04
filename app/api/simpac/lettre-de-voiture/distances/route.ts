import { NextRequest, NextResponse } from "next/server";

import { requireApiOrgAccess } from "@/lib/api-access";
import { findDistance, getAllCommunes } from "@/lib/distances";

export async function GET(request: NextRequest) {
  const { response } = await requireApiOrgAccess("simpac", request);
  if (response) return response;

  const { searchParams } = request.nextUrl;
  const depart = searchParams.get("depart");
  const arrivee = searchParams.get("arrivee");

  if (depart && arrivee) {
    const km = findDistance(depart, arrivee);
    return NextResponse.json({ depart, arrivee, km });
  }

  return NextResponse.json({ communes: getAllCommunes() });
}
