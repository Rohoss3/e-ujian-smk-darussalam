import { NextResponse } from "next/server";
import { generateTemplateSoalExcel } from "@/lib/excel";

export async function GET() {
  try {
    const uint8 = await generateTemplateSoalExcel();

    return new Response(uint8 as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Bank_Soal_SMK.xlsx"',
      },
    });
  } catch (error) {
    console.error("Excel Template Error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat template Excel" }, { status: 500 });
  }
}
