"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
const server_1 = require("@apollo/server");
const standalone_1 = require("@apollo/server/standalone");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const type_defs_js_1 = require("./schema/type-defs.js");
const resolvers_js_1 = require("./schema/resolvers.js");
const prisma_js_1 = require("./db/prisma.js");
const producer_js_1 = require("./kafka/producer.js");
const consumer_js_1 = require("./kafka/consumer.js");
const JWT_SECRET = process.env.JWT_SECRET || "study-buddy-dev-secret";
async function bootstrap() {
    try {
        await prisma_js_1.prisma.$connect();
        console.log('[matching-service] database connected');
        await (0, producer_js_1.connectProducer)();
        await (0, consumer_js_1.startConsumer)();
        const server = new server_1.ApolloServer({
            typeDefs: type_defs_js_1.typeDefs,
            resolvers: resolvers_js_1.resolvers
        });
        const port = Number(process.env.PORT || 4004);
        const { url } = await (0, standalone_1.startStandaloneServer)(server, {
            listen: { port },
            context: async ({ req }) => {
                const authHeader = req.headers.authorization || "";
                const token = authHeader.replace("Bearer ", "").trim();
                if (!token)
                    return { userId: null };
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                    return { userId: decoded.userId };
                }
                catch {
                    return { userId: null };
                }
            }
        });
        console.log(`[matching-service] GraphQL running at ${url}`);
    }
    catch (error) {
        console.error('[matching-service] failed to start:', error);
        process.exit(1);
    }
}
bootstrap();
