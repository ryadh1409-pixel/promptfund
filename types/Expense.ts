export type ExpenseStatus = 'pending' | 'approved';

export type Expense = {
  id: string;
  projectId: string;
  title: string;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  status: ExpenseStatus;
};

export type CreateExpenseInput = Omit<Expense, 'id' | 'status'> & {
  status?: ExpenseStatus;
};

export type UpdateExpenseInput = Partial<Omit<Expense, 'id' | 'projectId'>>;

export type FundPoints = {
  id: string;
  userId: string;
  balance: number;
  lifetimeEarned: number;
  streakWeeks: number;
  history: Array<{
    id: string;
    label: string;
    points: number;
    date: string;
  }>;
};
