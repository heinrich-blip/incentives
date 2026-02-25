import { create } from "zustand";
import type {
  CustomFormula,
  Driver,
  DriverPerformance,
  DriverSalaryHistory,
  IncentiveCalculation,
  IncentiveSetting,
  KilometerRate,
  MonthlyBudget,
  ZigUsdConversionRate,
} from "../types/database";

interface AppState {
  // Drivers
  drivers: Driver[];
  setDrivers: (drivers: Driver[]) => void;
  addDriver: (driver: Driver) => void;
  updateDriver: (driver: Driver) => void;
  removeDriver: (id: string) => void;

  // Kilometer Rates
  kilometerRates: KilometerRate[];
  setKilometerRates: (rates: KilometerRate[]) => void;

  // Monthly Budgets
  monthlyBudgets: MonthlyBudget[];
  setMonthlyBudgets: (budgets: MonthlyBudget[]) => void;

  // ZIG-USD Conversion Rates
  zigUsdConversionRates: ZigUsdConversionRate[];
  setZigUsdConversionRates: (rates: ZigUsdConversionRate[]) => void;

  // Driver Salary History
  driverSalaryHistory: DriverSalaryHistory[];
  setDriverSalaryHistory: (history: DriverSalaryHistory[]) => void;

  // Incentive Settings
  incentiveSettings: IncentiveSetting[];
  setIncentiveSettings: (settings: IncentiveSetting[]) => void;

  // Custom Formulas
  customFormulas: CustomFormula[];
  setCustomFormulas: (formulas: CustomFormula[]) => void;

  // Performance
  driverPerformance: DriverPerformance[];
  setDriverPerformance: (performance: DriverPerformance[]) => void;
  removeDriverPerformance: (id: string) => void;

  // Incentive Calculations
  incentiveCalculations: IncentiveCalculation[];
  setIncentiveCalculations: (calculations: IncentiveCalculation[]) => void;

  // UI State
  selectedYear: number;
  selectedMonth: number;
  setSelectedPeriod: (year: number, month: number) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  toastMessage: string | null;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Drivers
  drivers: [],
  setDrivers: (drivers) => set({ drivers }),
  addDriver: (driver) =>
    set((state) => ({ drivers: [...state.drivers, driver] })),
  updateDriver: (driver) =>
    set((state) => ({
      drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
    })),
  removeDriver: (id) =>
    set((state) => ({
      drivers: state.drivers.filter((d) => d.id !== id),
    })),

  // Kilometer Rates
  kilometerRates: [],
  setKilometerRates: (kilometerRates) => set({ kilometerRates }),

  // Monthly Budgets
  monthlyBudgets: [],
  setMonthlyBudgets: (monthlyBudgets) => set({ monthlyBudgets }),

  // ZIG-USD Conversion Rates
  zigUsdConversionRates: [],
  setZigUsdConversionRates: (zigUsdConversionRates) => set({ zigUsdConversionRates }),

  // Driver Salary History
  driverSalaryHistory: [],
  setDriverSalaryHistory: (driverSalaryHistory) => set({ driverSalaryHistory }),

  // Incentive Settings
  incentiveSettings: [],
  setIncentiveSettings: (incentiveSettings) => set({ incentiveSettings }),

  // Custom Formulas
  customFormulas: [],
  setCustomFormulas: (customFormulas) => set({ customFormulas }),

  // Performance
  driverPerformance: [],
  setDriverPerformance: (driverPerformance) => set({ driverPerformance }),
  removeDriverPerformance: (id) =>
    set((state) => ({
      driverPerformance: state.driverPerformance.filter((p) => p.id !== id),
    })),

  // Incentive Calculations
  incentiveCalculations: [],
  setIncentiveCalculations: (incentiveCalculations) =>
    set({ incentiveCalculations }),

  // UI State
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
  setSelectedPeriod: (selectedYear, selectedMonth) =>
    set({ selectedYear, selectedMonth }),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  toastMessage: null,
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
  hideToast: () => set({ toastMessage: null }),
}));
