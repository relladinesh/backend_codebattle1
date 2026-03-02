import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, "../../../../proto/core.proto");

const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def);
const core = pkg.core;

const CORE_GRPC_URL = process.env.CORE_GRPC_URL ;

const historyClient = new core.HistoryService(
  CORE_GRPC_URL,
  grpc.credentials.createInsecure()
);

export function getRecentBattlesGrpc(limit = 20) {
  return new Promise((resolve, reject) => {
    historyClient.GetRecentBattles({ limit }, (err, res) => {
      if (err) return reject(err);
      resolve(res?.battles || []);
    });
  });
}

export function getBattleDetailsGrpc(roomCode) {
  return new Promise((resolve, reject) => {
    historyClient.GetBattleDetails({ roomCode }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}