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

const battleClient = new core.BattleService(
  CORE_GRPC_URL,
  grpc.credentials.createInsecure()
);

export function persistBattleResultGrpc(roomSnapshot) {
  return new Promise((resolve, reject) => {
    battleClient.PersistBattleResult({ room: roomSnapshot }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}