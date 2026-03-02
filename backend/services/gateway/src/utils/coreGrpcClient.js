import "dotenv/config";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ adjust if your proto path differs
const PROTO_PATH = path.resolve(__dirname, "../../../../proto/core.proto");

const CORE_GRPC_URL = process.env.CORE_GRPC_URL;

const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def);
const core = pkg.core;

if (!core?.ProblemService) throw new Error("ProblemService not found in proto");
if (!core?.BattleService) throw new Error("BattleService not found in proto");

const problemClient = new core.ProblemService(CORE_GRPC_URL, grpc.credentials.createInsecure());
const battleClient = new core.BattleService(CORE_GRPC_URL, grpc.credentials.createInsecure());

/* =========================
   PROBLEM RPCs
   ========================= */
export function getRandomProblemsGrpc({ topic, count }) {
  return new Promise((resolve, reject) => {
    problemClient.GetRandomProblems({ topic, count }, (err, res) => {
      if (err) return reject(err);
      resolve(res?.problems || []);
    });
  });
}

export function getProblemDetailsGrpc({ problemId, includeHidden = false }) {
  return new Promise((resolve, reject) => {
    problemClient.GetProblemDetails({ problemId, includeHidden }, (err, res) => {
      if (err) return reject(err);
      resolve({
        problem: res?.problem || null,
        testcases: res?.testcases || [],
      });
    });
  });
}

/* =========================
   BATTLE RPCs
   ========================= */

export function persistBattleResultGrpc(roomSnapshot) {
  return new Promise((resolve, reject) => {
    battleClient.PersistBattleResult({ room: roomSnapshot }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export function persistSubmissionGrpc(payload) {
  return new Promise((resolve, reject) => {
    battleClient.PersistSubmission(payload, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}