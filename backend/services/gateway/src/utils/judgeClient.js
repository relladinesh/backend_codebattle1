import axios from "axios";

// ✅ FIX: your .env has JUDGE0_BASE_URL (not JUDGE0_URL)
const JUDGE0_URL = process.env.JUDGE0_BASE_URL || "https://ce.judge0.com";

// If you use RapidAPI in future, keep these (optional)
const JUDGE0_KEY = process.env.JUDGE0_KEY || null;
const JUDGE0_HOST = process.env.JUDGE0_HOST || null;

/**
 * Convert Judge0 response -> our verdict
 */
function normalizeVerdict(res) {
  const statusId = res?.status?.id;
  const desc = String(res?.status?.description || "");

  // Judge0 status ids:
  // 3 Accepted
  // 4 Wrong Answer
  // 5 Time Limit Exceeded
  // 6 Compilation Error
  // 7 Runtime Error (SIGSEGV)
  // 8 Runtime Error (SIGXFSZ)
  // 9 Runtime Error (SIGFPE)
  // 10 Runtime Error (SIGABRT)
  // 11 Runtime Error (NZEC)
  // 12 Runtime Error (other)
  // 13 Internal Error
  // 14 Exec Format Error

  if (statusId === 3) return "AC";
  if (statusId === 4) return "WA";
  if (statusId === 5) return "TLE";
  if (statusId === 6) return "CE";
  if ([7, 8, 9, 10, 11, 12, 14].includes(statusId)) return "RE";
  if (statusId === 13) return "ERROR";

  // fallback using description text
  const low = desc.toLowerCase();
  if (low.includes("accepted")) return "AC";
  if (low.includes("wrong")) return "WA";
  if (low.includes("time")) return "TLE";
  if (low.includes("compile")) return "CE";
  if (low.includes("runtime")) return "RE";

  return "ERROR";
}

/**
 * ✅ Runs code in Judge0
 * language_id must be numeric (62 java, 71 python, 54 cpp, 63 js)
 */
export async function runOnJudge0({ language_id, source_code, stdin }) {
  if (!JUDGE0_URL) throw new Error("JUDGE0_BASE_URL missing in .env");

  const headers = {};

  // ✅ If RapidAPI is used (optional)
  if (JUDGE0_KEY) headers["X-RapidAPI-Key"] = JUDGE0_KEY;
  if (JUDGE0_HOST) headers["X-RapidAPI-Host"] = JUDGE0_HOST;

  // ✅ wait=true returns result immediately (no polling needed)
  const { data } = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    {
      language_id: Number(language_id),
      source_code: String(source_code || ""),
      stdin: String(stdin || ""),
    },
    { headers }
  );

  return {
    verdict: normalizeVerdict(data),
    status: data?.status || null,
    stdout: data?.stdout ?? "",
    stderr: data?.stderr ?? "",
    compile_output: data?.compile_output ?? "",
    time: data?.time ?? null,
    memory: data?.memory ?? null,
  };
}