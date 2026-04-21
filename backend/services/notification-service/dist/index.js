"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
const server_1 = require("@apollo/server");
const standalone_1 = require("@apollo/server/standalone");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const resolvers_1 = require("./schema/resolvers");
const type_defs_1 = require("./schema/type-defs");
const consumer_1 = require("./kafka/consumer");
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Check backend/.env');
}
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
exports.prisma = new client_1.PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const getUserIdFromRequest = (req) => {
    const forwardedUserId = req.headers['x-user-id'];
    if (typeof forwardedUserId === 'string' && forwardedUserId.trim()) {
        return forwardedUserId.trim();
    }
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const tokenValue = authHeader.replace('Bearer ', '').trim();
        if (tokenValue && !tokenValue.includes('.')) {
            return tokenValue;
        }
        if (tokenValue) {
            try {
                const decoded = jsonwebtoken_1.default.verify(tokenValue, JWT_SECRET);
                return decoded.userId ?? null;
            }
            catch {
                return null;
            }
        }
    }
    return null;
};
async function main() {
    const server = new server_1.ApolloServer({
        typeDefs: type_defs_1.typeDefs,
        resolvers: resolvers_1.resolvers,
    });
    const port = Number(process.env.PORT) || 4006;
    const { url } = await (0, standalone_1.startStandaloneServer)(server, {
        listen: { port },
        context: async ({ req }) => ({
            prisma: exports.prisma,
            userId: getUserIdFromRequest(req),
        }),
    });
    console.log(`Notification service ready at ${url}`);
    await (0, consumer_1.startNotificationConsumer)(exports.prisma);
}
main().catch(async (error) => {
    console.error('Notification service failed to start:', error);
    await exports.prisma.$disconnect();
    process.exit(1);
});
