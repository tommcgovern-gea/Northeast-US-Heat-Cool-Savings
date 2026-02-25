import { NextRequest, NextResponse } from "next/server";
import { mockEnergyRecords, EnergyRecord } from "@/lib/mock-energy";
import { mockBuildings } from "@/lib/mock-buildings";
import { mockCities } from "@/lib/mock-cities";
import { verifyToken, TokenPayload } from "@/lib/auth";

/**
 * Helper: extract and verify JWT from Authorization header.
 */
function authenticateRequest(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

/**
 * Helper: authorize admin or staff access.
 */
function authorizeAdminOrStaff(user: TokenPayload): boolean {
  return user.role === "ADMIN" || user.role === "STAFF";
}

// ─────────────────────────────────────────────────────
// POST /api/energy/:buildingId/upload
// Staff uploads monthly energy and degree-day data.
// One record per month.
// ─────────────────────────────────────────────────────
export const uploadEnergyData = async (req: NextRequest, buildingId: string) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!authorizeAdminOrStaff(user)) {
      return NextResponse.json({ message: "Forbidden: Admin or Staff only" }, { status: 403 });
    }

    const building = mockBuildings.find(b => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      month,
      year,
      elecKwh = null,
      gasTherm = null,
      fuelOilGal = null,
      districtSteamMlb = null,
      totalKbtu,
      hdd = null,
      cdd = null,
      isBaseline = false,
    } = body;

    // Validate required fields
    if (!month || !year || totalKbtu === undefined || totalKbtu === null) {
      return NextResponse.json(
        { message: "Missing required fields: month, year, totalKbtu" },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ message: "Month must be between 1 and 12" }, { status: 400 });
    }

    // Check for duplicate (same building, month, year, baseline status)
    const existing = mockEnergyRecords.find(
      r => r.buildingId === buildingId && r.month === month && r.year === year && r.isBaseline === isBaseline
    );
    if (existing) {
      return NextResponse.json(
        { message: `Energy record already exists for ${month}/${year} (isBaseline: ${isBaseline}). Delete or update instead.` },
        { status: 409 }
      );
    }

    // Calculate kBTU per degree day
    const kbtuPerHdd = hdd && hdd > 0 ? Math.round((totalKbtu / hdd) * 10) / 10 : null;
    const kbtuPerCdd = cdd && cdd > 0 ? Math.round((totalKbtu / cdd) * 10) / 10 : null;

    const newRecord: EnergyRecord = {
      id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      buildingId,
      month,
      year,
      elecKwh,
      gasTherm,
      fuelOilGal,
      districtSteamMlb,
      totalKbtu,
      hdd,
      cdd,
      kbtuPerHdd,
      kbtuPerCdd,
      isBaseline,
      createdAt: new Date().toISOString(),
    };

    mockEnergyRecords.push(newRecord);

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error("Error uploading energy data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// GET /api/energy/:buildingId
// Get all energy records for a building. Admin or staff.
// Query: { from?: string, to?: string, isBaseline?: boolean }
// ─────────────────────────────────────────────────────
export const getEnergyRecords = async (req: NextRequest, buildingId: string) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!authorizeAdminOrStaff(user)) {
      return NextResponse.json({ message: "Forbidden: Admin or Staff only" }, { status: 403 });
    }

    const building = mockBuildings.find(b => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const isBaselineParam = searchParams.get("isBaseline");

    let records = mockEnergyRecords.filter(r => r.buildingId === buildingId);

    // Filter by date range
    if (from) {
      const fromDate = new Date(from);
      records = records.filter(r => new Date(r.createdAt) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      records = records.filter(r => new Date(r.createdAt) <= toDate);
    }

    // Filter by baseline status
    if (isBaselineParam !== null && isBaselineParam !== undefined) {
      const isBaseline = isBaselineParam === "true";
      records = records.filter(r => r.isBaseline === isBaseline);
    }

    // Sort by year desc, month desc
    records.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching energy records:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// GET /api/energy/:buildingId/savings
// Compare current month vs baseline. Returns savings report.
// Query: { month: number, year: number }
// ─────────────────────────────────────────────────────
export const getEnergySavings = async (req: NextRequest, buildingId: string) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!authorizeAdminOrStaff(user)) {
      return NextResponse.json({ message: "Forbidden: Admin or Staff only" }, { status: 403 });
    }

    const building = mockBuildings.find(b => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "0");
    const year = parseInt(searchParams.get("year") || "0");

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { message: "Missing or invalid query params: month (1-12), year" },
        { status: 400 }
      );
    }

    // Get baseline records for this building & month (across all baseline years)
    const baselineRecords = mockEnergyRecords.filter(
      r => r.buildingId === buildingId && r.month === month && r.isBaseline === true
    );

    // Get current record for this building, month, year (non-baseline)
    let currentRecord = mockEnergyRecords.find(
      r => r.buildingId === buildingId && r.month === month && r.year === year && r.isBaseline === false
    );

    // If no non-baseline record, check if there's a record for the given year (baseline or not)
    if (!currentRecord) {
      currentRecord = mockEnergyRecords.find(
        r => r.buildingId === buildingId && r.month === month && r.year === year
      ) || undefined;
    }

    if (!currentRecord) {
      return NextResponse.json(
        { message: `No energy record found for ${month}/${year}` },
        { status: 404 }
      );
    }

    // Calculate baseline averages
    let baselineKbtuPerHdd: number | null = null;
    let baselineKbtuPerCdd: number | null = null;

    if (baselineRecords.length > 0) {
      const hddRecords = baselineRecords.filter(r => r.kbtuPerHdd !== null);
      const cddRecords = baselineRecords.filter(r => r.kbtuPerCdd !== null);

      if (hddRecords.length > 0) {
        baselineKbtuPerHdd = Math.round(
          (hddRecords.reduce((sum, r) => sum + (r.kbtuPerHdd || 0), 0) / hddRecords.length) * 10
        ) / 10;
      }

      if (cddRecords.length > 0) {
        baselineKbtuPerCdd = Math.round(
          (cddRecords.reduce((sum, r) => sum + (r.kbtuPerCdd || 0), 0) / cddRecords.length) * 10
        ) / 10;
      }
    }

    // Calculate savings percentages
    // savingsPct = ((baseline - current) / baseline) * 100
    // Positive = savings, Negative = increased consumption
    let hddSavingsPct: number | null = null;
    let cddSavingsPct: number | null = null;

    if (baselineKbtuPerHdd !== null && currentRecord.kbtuPerHdd !== null && baselineKbtuPerHdd > 0) {
      hddSavingsPct = Math.round(
        ((baselineKbtuPerHdd - currentRecord.kbtuPerHdd) / baselineKbtuPerHdd) * 100 * 10
      ) / 10;
    }

    if (baselineKbtuPerCdd !== null && currentRecord.kbtuPerCdd !== null && baselineKbtuPerCdd > 0) {
      cddSavingsPct = Math.round(
        ((baselineKbtuPerCdd - currentRecord.kbtuPerCdd) / baselineKbtuPerCdd) * 100 * 10
      ) / 10;
    }

    return NextResponse.json({
      buildingId,
      month,
      year,
      baselineKbtuPerHdd,
      baselineKbtuPerCdd,
      currentKbtuPerHdd: currentRecord.kbtuPerHdd,
      currentKbtuPerCdd: currentRecord.kbtuPerCdd,
      hddSavingsPct,
      cddSavingsPct,
      totalKbtu: currentRecord.totalKbtu,
      elecKwh: currentRecord.elecKwh,
      gasTherm: currentRecord.gasTherm,
      fuelOilGal: currentRecord.fuelOilGal,
      districtSteamMlb: currentRecord.districtSteamMlb,
    });
  } catch (error) {
    console.error("Error fetching energy savings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// GET /api/energy/:buildingId/report/pdf
// Generate and return a mock PDF energy savings report.
// Query: { month: number, year: number, emailTo?: string }
// ─────────────────────────────────────────────────────
export const getEnergyReportPdf = async (req: NextRequest, buildingId: string) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!authorizeAdminOrStaff(user)) {
      return NextResponse.json({ message: "Forbidden: Admin or Staff only" }, { status: 403 });
    }

    const building = mockBuildings.find(b => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const city = mockCities.find(c => c.id === building.cityId);

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "0");
    const year = parseInt(searchParams.get("year") || "0");
    const emailTo = searchParams.get("emailTo");

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { message: "Missing or invalid query params: month (1-12), year" },
        { status: 400 }
      );
    }

    // Get the current record
    const currentRecord = mockEnergyRecords.find(
      r => r.buildingId === buildingId && r.month === month && r.year === year
    );

    if (!currentRecord) {
      return NextResponse.json(
        { message: `No energy record found for ${month}/${year}` },
        { status: 404 }
      );
    }

    // Get baseline records for savings comparison
    const baselineRecords = mockEnergyRecords.filter(
      r => r.buildingId === buildingId && r.month === month && r.isBaseline === true
    );

    let baselineKbtuPerHdd: number | null = null;
    let baselineKbtuPerCdd: number | null = null;

    if (baselineRecords.length > 0) {
      const hddRecords = baselineRecords.filter(r => r.kbtuPerHdd !== null);
      const cddRecords = baselineRecords.filter(r => r.kbtuPerCdd !== null);

      if (hddRecords.length > 0) {
        baselineKbtuPerHdd = Math.round(
          (hddRecords.reduce((sum, r) => sum + (r.kbtuPerHdd || 0), 0) / hddRecords.length) * 10
        ) / 10;
      }
      if (cddRecords.length > 0) {
        baselineKbtuPerCdd = Math.round(
          (cddRecords.reduce((sum, r) => sum + (r.kbtuPerCdd || 0), 0) / cddRecords.length) * 10
        ) / 10;
      }
    }

    // Calculate savings
    let hddSavingsPct: string = "N/A";
    let cddSavingsPct: string = "N/A";

    if (baselineKbtuPerHdd && currentRecord.kbtuPerHdd && baselineKbtuPerHdd > 0) {
      const pct = ((baselineKbtuPerHdd - currentRecord.kbtuPerHdd) / baselineKbtuPerHdd) * 100;
      hddSavingsPct = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
    }
    if (baselineKbtuPerCdd && currentRecord.kbtuPerCdd && baselineKbtuPerCdd > 0) {
      const pct = ((baselineKbtuPerCdd - currentRecord.kbtuPerCdd) / baselineKbtuPerCdd) * 100;
      cddSavingsPct = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
    }

    const monthNames = ["", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    // Generate a minimal valid PDF
    const reportContent = [
      `ENERGY SAVINGS REPORT`,
      `====================`,
      ``,
      `Building: ${building.name}`,
      `Address: ${building.address}`,
      `City: ${city?.name || building.cityName}, ${city?.state || ""}`,
      `Period: ${monthNames[month]} ${year}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `--- FUEL BREAKDOWN ---`,
      `Electric (kWh):        ${currentRecord.elecKwh ?? "N/A"}`,
      `Gas (Therms):          ${currentRecord.gasTherm ?? "N/A"}`,
      `Fuel Oil (Gal):        ${currentRecord.fuelOilGal ?? "N/A"}`,
      `District Steam (Mlb):  ${currentRecord.districtSteamMlb ?? "N/A"}`,
      ``,
      `--- TOTALS ---`,
      `Total kBTU:            ${currentRecord.totalKbtu}`,
      `HDD:                   ${currentRecord.hdd ?? "N/A"}`,
      `CDD:                   ${currentRecord.cdd ?? "N/A"}`,
      `kBTU/HDD:              ${currentRecord.kbtuPerHdd ?? "N/A"}`,
      `kBTU/CDD:              ${currentRecord.kbtuPerCdd ?? "N/A"}`,
      ``,
      `--- BASELINE COMPARISON ---`,
      `Baseline kBTU/HDD:     ${baselineKbtuPerHdd ?? "N/A"}`,
      `Baseline kBTU/CDD:     ${baselineKbtuPerCdd ?? "N/A"}`,
      `HDD Savings:           ${hddSavingsPct}`,
      `CDD Savings:           ${cddSavingsPct}`,
      ``,
      `--- NOTES ---`,
      `Positive savings % = reduced consumption vs baseline.`,
      `Negative savings % = increased consumption vs baseline.`,
      `Baseline is the average of 3 years of historical data.`,
    ].join("\n");

    // Build a minimal PDF document
    const pdfContent = buildSimplePdf(reportContent);

    // Mock email sending
    if (emailTo) {
      console.log(`[MOCK] PDF report emailed to: ${emailTo}`);
    }

    return new NextResponse(new Uint8Array(pdfContent), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="energy-report-${buildingId}-${month}-${year}.pdf"`,
        ...(emailTo ? { "X-Email-Sent-To": emailTo } : {}),
      },
    });
  } catch (error) {
    console.error("Error generating energy report PDF:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

/**
 * Build a minimal valid PDF from plain text content.
 * This creates a real PDF that can be opened by any PDF viewer.
 */
function buildSimplePdf(text: string): Buffer {
  const lines = text.split("\n");
  const fontSize = 10;
  const lineHeight = 14;
  const pageWidth = 612;  // US Letter
  const pageHeight = 792;
  const margin = 50;

  // Build content stream - position text on page
  let yPos = pageHeight - margin;
  let streamContent = `BT\n/F1 ${fontSize} Tf\n`;

  for (const line of lines) {
    if (yPos < margin) break; // Don't overflow page
    // Escape special PDF characters
    const safeLine = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    streamContent += `${margin} ${yPos} Td\n(${safeLine}) Tj\n0 -${lineHeight} Td\n`;
    yPos -= lineHeight;
    // Reset position for absolute positioning
    streamContent = streamContent.replace(
      `${margin} ${yPos + lineHeight} Td\n(${safeLine}) Tj\n0 -${lineHeight} Td\n`,
      `1 0 0 1 ${margin} ${yPos + lineHeight} Tm\n(${safeLine}) Tj\n`
    );
    // Simpler approach: just use absolute positioning
  }

  streamContent += "ET";

  // Rebuild with simpler approach
  yPos = pageHeight - margin;
  streamContent = `BT\n/F1 ${fontSize} Tf\n`;
  for (const line of lines) {
    if (yPos < margin) break;
    const safeLine = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    streamContent += `1 0 0 1 ${margin} ${yPos} Tm\n(${safeLine}) Tj\n`;
    yPos -= lineHeight;
  }
  streamContent += "ET";

  const streamBytes = Buffer.from(streamContent, "utf-8");

  const objects: string[] = [];

  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Object 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");

  // Object 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`
  );

  // Object 4: Content stream
  objects.push(
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj`
  );

  // Object 5: Font
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj"
  );

  // Build PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += obj + "\n";
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}
