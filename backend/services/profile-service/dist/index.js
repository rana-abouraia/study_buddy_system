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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const type_defs_1 = require("./schema/type-defs");
const resolvers_1 = require("./schema/resolvers");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
exports.prisma = new client_1.PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || '123456';
async function main() {
    const server = new server_1.ApolloServer({
        typeDefs: type_defs_1.typeDefs,
        resolvers: resolvers_1.resolvers,
    });
    const { url } = await (0, standalone_1.startStandaloneServer)(server, {
        listen: { port: Number(process.env.PORT) || 4002 },
        context: async ({ req }) => {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.replace('Bearer ', '').trim();
            let userId = null;
            if (token) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                    userId = decoded.userId;
                }
                catch {
                    userId = null;
                }
            }
            return { userId, prisma: exports.prisma };
        },
    });
    console.log(`Profile service ready at: ${url}`);
}
main().catch(async (error) => {
    console.error('Failed to start profile service:', error);
    await exports.prisma.$disconnect();
    process.exit(1);
});
