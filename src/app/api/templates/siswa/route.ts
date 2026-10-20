import { generateTemplateSiswaExcel } from "@/lib/excel";

export async function GET() {
  try {
    const uint8 = await generateTemplateSiswaExcel();
    return new Response(uint8 as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Import_Siswa_SMK.xlsx"',
      },
    });
  } catch (error) {
    console.error("Template Siswa Error:", error);
    return new Response(JSON.stringify({ success: false, message: "Gagal membuat template siswa" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
