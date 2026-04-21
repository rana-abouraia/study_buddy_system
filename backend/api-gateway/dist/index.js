"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
const server_1 = require("@apollo/server");
const standalone_1 = require("@apollo/server/standalone");
const stitch_1 = require("@graphql-tools/stitch");
const wrap_1 = require("@graphql-tools/wrap");
const executor_http_1 = require("@graphql-tools/executor-http");
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForSubgraph(name, url, retries = 30, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ query: 'query { __typename }' })
            });
            if (response.ok) {
                console.log(`${name} is ready at ${url}`);
                return;
            }
            console.log(`${name} responded with ${response.status}. Retry ${attempt}/${retries}`);
        }
        catch {
            console.log(`Waiting for ${name} at ${url}... (${attempt}/${retries})`);
        }
        await sleep(delayMs);
    }
    throw new Error(`Timed out waiting for ${name} at ${url}`);
}
async function startServer() {
    const subgraphConfigs = [
        { name: 'user', url: process.env.USER_SERVICE_URL || 'http://localhost:4001' },
        { name: 'profile', url: process.env.PROFILE_SERVICE_URL || 'http://localhost:4002' },
        { name: 'availability', url: process.env.AVAILABILITY_SERVICE_URL || 'http://localhost:4003' },
        { name: 'matching', url: process.env.MATCHING_SERVICE_URL || 'http://localhost:4004' },
        { name: 'session', url: process.env.SESSION_SERVICE_URL || 'http://localhost:4005' },
        { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006' },
        { name: 'messaging', url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:4007' }
    ];
    for (const service of subgraphConfigs) {
        await waitForSubgraph(service.name, service.url);
    }
    const subschemas = await Promise.all(subgraphConfigs.map(async ({ url }) => {
        const introspectionExecutor = (0, executor_http_1.buildHTTPExecutor)({ endpoint: url });
        const executor = (0, executor_http_1.buildHTTPExecutor)({
            endpoint: url,
            headers: (executorRequest) => ({
                'content-type': 'application/json',
                authorization: executorRequest?.context?.headers?.authorization || ''
            })
        });
        const schema = await (0, wrap_1.schemaFromExecutor)(introspectionExecutor);
        return { schema, executor };
    }));
    const schema = (0, stitch_1.stitchSchemas)({
        subschemas,
        typeMergingOptions: {
            validationScopes: {
                'AvailabilitySlot.dayOfWeek': {
                    validationLevel: stitch_1.ValidationLevel.Off
                }
            }
        }
    });
    const server = new server_1.ApolloServer({ schema });
    const { url } = await (0, standalone_1.startStandaloneServer)(server, {
        listen: { port: Number(process.env.PORT) || 4000 },
        context: async ({ req }) => ({
            headers: {
                authorization: req.headers.authorization || ''
            }
        })
    });
    console.log(`API Gateway running at ${url}`);
}
startServer().catch((error) => {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
});
