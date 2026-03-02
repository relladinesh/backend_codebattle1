


// backend/services/core-service/src/index.js
import "dotenv/config";
import { startGrpcAll } from "./grpc/server.js";

const port = Number(process.env.CORE_GRPC_PORT );
startGrpcAll(port);