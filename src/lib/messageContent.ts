/** Parse queued message plain text (same structure as email templates). */
export function parseMessagePlainText(text: string): {
  body: string;
  uploadUrl: string | null;
  uploadHeading: string;
} {
  const trimmed = text.trimEnd();

  const labeled =
    /^([\s\S]*)\r?\n(?:upload photo or bms record:|upload link:)\s*(https?:\/\/\S+)\s*$/im.exec(
      trimmed,
    );
  const tailUrl =
    /^([\s\S]*)\r?\n(https?:\/\/[^\s]+\/upload\?token=[^\s]+)\s*$/im.exec(
      trimmed,
    );

  if (labeled) {
    return {
      body: (labeled[1] ?? "").trimEnd(),
      uploadHeading: /\bupload link:/i.test(labeled[0])
        ? "Upload link"
        : "Upload photo or BMS record",
      uploadUrl: labeled[2]?.trim().replace(/[.)]+$/, "") ?? null,
    };
  }

  if (tailUrl) {
    return {
      body: (tailUrl[1] ?? "").trimEnd(),
      uploadHeading: "Upload photo or BMS record",
      uploadUrl: tailUrl[2]?.trim().replace(/[.)]+$/, "") ?? null,
    };
  }

  const onlyUpload =
    /^(?:upload photo or bms record:|upload link:)\s*(https?:\/\/\S+)\s*$/im.exec(
      trimmed,
    );
  if (onlyUpload) {
    return {
      body: "",
      uploadHeading: /\bupload link:/i.test(trimmed)
        ? "Upload link"
        : "Upload photo or BMS record",
      uploadUrl: onlyUpload[1]?.trim().replace(/[.)]+$/, "") ?? null,
    };
  }

  return { body: trimmed, uploadUrl: null, uploadHeading: "Upload photo or BMS record" };
}

export function extractUploadTokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/upload\?token=([a-f0-9-]+)/i);
  return match?.[1] ?? null;
}
