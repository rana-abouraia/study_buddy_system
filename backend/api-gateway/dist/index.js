"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const server_1 = require("@apollo/server");
const gateway_1 = require("@apollo/gateway");
const standalone_1 = require("@apollo/server/standalone");
const gateway = new gateway_1.ApolloGateway({
    supergraphSdl: new gateway_1.IntrospectAndCompose({
        subgraphs: [
            { name: 'user', url: process.env.USER_SERVICE_URL },
            { name: 'profile', url: process.env.PROFILE_SERVICE_URL },
            { name: 'availability', url: process.env.AVAILABILITY_SERVICE_URL },
            { name: 'matching', url: process.env.MATCHING_SERVICE_URL },
            { name: 'session', url: process.env.SESSION_SERVICE_URL },
            { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL },
            { name: 'messaging', url: process.env.MESSAGING_SERVICE_URL }
        ],
        pollIntervalInMs: 5000
    })
});
const server = new server_1.ApolloServer({
    gateway
});
async function startServer() {
    const { url } = await (0, standalone_1.startStandaloneServer)(server, {
        listen: { port: Number(process.env.PORT) || 4000 },
        context: async ({ req }) => {
            return {
                headers: {
                    authorization: req.headers.authorization || ''
                }
            };
        }
    });
    console.log(`🚀 API Gateway running at ${url}`);
}
startServer().catch(console.error);
