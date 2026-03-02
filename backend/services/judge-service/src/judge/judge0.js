import axios from "axios";

const JUDGE0_URL = process.env.JUDGE0_URL; // example: https://judge0-ce.p.rapidapi.com
const JUDGE0_KEY = process.env.JUDGE0_KEY; // rapidapi key (if needed)

// map your frontend language to judge0 language_id
const LANG = {
  javascript: 63, // Node.js
  python: 71,
  java: 62,
  cpp: 54,
};

export async function runOnJudge0({ language, sourceCode, stdin }) {
  const language_id = LANG[String(language).toLowerCase()];
  if (!language_id) throw new Error(`Unsupported language: ${language}`);

  const headers = {};
  // if rapidapi:
  if (JUDGE0_KEY) {
    headers["X-RapidAPI-Key"] = JUDGE0_KEY;
    headers["X-RapidAPI-Host"] = new URL(JUDGE0_URL).host;
  }

  // 1) create submission
  const createRes = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    {
      language_id,
      source_code: sourceCode,
      stdin,
    },
    { headers }
  );

  const res = createRes.data;

  // Judge0 returns status + stdout + stderr + compile_output
  return {
    statusId: res.status?.id,
    statusDesc: res.status?.description,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    compileOutput: res.compile_output ?? "",
    time: res.time ?? null,
    memory: res.memory ?? null,
  };
}
