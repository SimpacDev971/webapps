import { NextRequest, NextResponse } from "next/server";

import { requireApiOrgAccess } from "@/lib/api-access";
import { getDefaultCabinetId, searchDocuments } from "@/lib/docuware";

interface DwField {
  FieldName: string;
  Item: string | null;
}

interface DwItem {
  Id: number;
  Fields?: DwField[];
  Title?: string;
}

export async function GET(request: NextRequest) {
  const { response } = await requireApiOrgAccess("simpac", request);
  if (response) return response;

  const { searchParams } = request.nextUrl;
  const cabinetId = searchParams.get("cabinetId") || getDefaultCabinetId();
  const docType = searchParams.get("docType") || "Demande de livraison";

  const query = {
    Condition: [{ DBName: "DOCUMENT_TYPE", Value: [docType] }],
  };

  try {
    const items = await searchDocuments(cabinetId, query);

    const documents = items.map((item: DwItem) => {
      const fields = item.Fields || [];
      const getField = (name: string) =>
        fields.find((f: DwField) => f.FieldName === name)?.Item ?? null;
      return {
        id: item.Id,
        documentNumber: getField("DOCUMENT_NUMBER"),
        documentType: getField("DOCUMENT_TYPE"),
        expediteur: getField("NOM_EXPEDITEUR"),
        communeDepart: getField("COMMUNE_DEPART"),
        title: item.Title || null,
      };
    });

    return NextResponse.json(documents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
