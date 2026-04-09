import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock database (replace with Prisma later)
const users = [];
const JWT_SECRET = 'your-secret-key-change-in-production';

export const resolvers = {
  Query: {
    getUser: (_, { id }) => {
      return users.find(user => user.id === id);
    },
    
    getAllUsers: () => {
      return users;
    },
    
    me: (_, __, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      return users.find(user => user.id === userId);
    }
  },

  Mutation: {
    register: async (_, { input }) => {
      // Check if user exists
      const existingUser = users.find(u => u.email === input.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const newUser = {
        id: String(users.length + 1),
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        university: input.university,
        academicYear: input.academicYear
      };

      users.push(newUser);
      
      // Generate token
      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

      return {
        ...newUser,
        token
      };
    },

    login: async (_, { input }) => {
      // Find user
      const user = users.find(u => u.email === input.email);
      if (!user) {
        throw new Error('User not found');
      }

      // Check password
      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      return token;
    }
  }
};