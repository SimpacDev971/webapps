import { NextRequest, NextResponse } from "next/server";

import { requireApiOrgAccess } from "@/lib/api-access";
import { getDefaultCabinetId, getDocument } from "@/lib/docuware";

export async function GET(request: NextRequest) {
  const { response } = await requireApiOrgAccess("simpac", request);
  if (response) return response;

  const id = request.nextUrl.searchParams.get("id");
  const cabinetId =
    request.nextUrl.searchParams.get("cabinetId") || getDefaultCabinetId();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const doc = await getDocument(cabinetId, parseInt(id));
    return NextResponse.json(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
