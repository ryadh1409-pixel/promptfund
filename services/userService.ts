import { currentUser, fundPoints, investorUser, users } from '@/data/mockData';
import type { FundPoints } from '@/types/Expense';
import type { CreateUserInput, UpdateUserInput, User } from '@/types/User';

function createId(handle: string) {
  return handle
    .replace('@', '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');
}

export const userService = {
  async getCurrentUser(): Promise<User> {
    return currentUser;
  },

  async getInvestorProfile(): Promise<User> {
    return investorUser;
  },

  async listUsers(): Promise<User[]> {
    return users;
  },

  async getUserById(userId: string): Promise<User | null> {
    return users.find((user) => user.id === userId) ?? null;
  },

  async createUser(input: CreateUserInput): Promise<User> {
    return {
      ...input,
      id: createId(input.handle),
      trustScore: input.trustScore ?? 50,
    };
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
    const user = await this.getUserById(userId);

    if (!user) {
      return null;
    }

    return {
      ...user,
      ...input,
    };
  },

  async getFundPointsByUserId(userId: string): Promise<FundPoints | null> {
    return fundPoints.find((wallet) => wallet.userId === userId) ?? null;
  },
};
