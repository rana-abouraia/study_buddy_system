import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { Context } from '../index';
import { publishEvent } from '../kafka/producer';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const resolvers = {
  Query: {
    getUser: async (_: any, { id }: { id: string }) => {
      return await prisma.user.findUnique({ where: { id } });
    },

    getAllUsers: async () => {
      return await prisma.user.findMany();
    },

    me: async (_: any, __: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');
      return await prisma.user.findUnique({ where: { id: userId } });
    }
  },

  Mutation: {
    register: async (_: any, args: any) => {
      const existing = await prisma.user.findUnique({
        where: { email: args.email }
      });
      if (existing) throw new Error('User already exists');

      const hashedPassword = await bcrypt.hash(args.password, 10);

      const user = await prisma.user.create({
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

      await publishEvent('user.created', {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        university: user.university,
        academicYear: user.academicYear
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user };
    },

    login: async (_: any, { email, password }: { email: string, password: string }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('User not found');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid password');

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user };
    },

    updateUser: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new Error('Not authenticated');

      const user = await prisma.user.update({
        where: { id: userId },
        data: { ...args }
      });

      await publishEvent('user.updated', {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        university: user.university,
        academicYear: user.academicYear,
        phone: user.phone
      });

      return user;
    }
  }
};
