"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const producer_1 = require("../kafka/producer");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
exports.resolvers = {
    Query: {
        getUser: async (_, { id }) => {
            return await index_1.prisma.user.findUnique({ where: { id } });
        },
        getAllUsers: async () => {
            return await index_1.prisma.user.findMany();
        },
        me: async (_, __, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            return await index_1.prisma.user.findUnique({ where: { id: userId } });
        }
    },
    Mutation: {
        register: async (_, args) => {
            const existing = await index_1.prisma.user.findUnique({
                where: { email: args.email }
            });
            if (existing)
                throw new Error('User already exists');
            const hashedPassword = await bcryptjs_1.default.hash(args.password, 10);
            const user = await index_1.prisma.user.create({
                data: {
                    email: args.email,
                    password: hashedPassword,
                    firstName: args.firstName,
                    lastName: args.lastName,
                    university: args.university,
                    academicYear: args.academicYear,
                    phone: args.phone
                }
            });
            await (0, producer_1.publishEvent)('user-preferences-updated', {
                userId: user.id,
                email: user.email,
                university: user.university,
                academicYear: user.academicYear
            });
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            return { token, user };
        },
        login: async (_, { email, password }) => {
            const user = await index_1.prisma.user.findUnique({ where: { email } });
            if (!user)
                throw new Error('User not found');
            const valid = await bcryptjs_1.default.compare(password, user.password);
            if (!valid)
                throw new Error('Invalid password');
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            return { token, user };
        },
        updateUser: async (_, args, { userId }) => {
            if (!userId)
                throw new Error('Not authenticated');
            const user = await index_1.prisma.user.update({
                where: { id: userId },
                data: { ...args }
            });
            await (0, producer_1.publishEvent)('user-preferences-updated', {
                userId: user.id,
                email: user.email,
                university: user.university,
                academicYear: user.academicYear
            });
            return user;
        }
    }
};
