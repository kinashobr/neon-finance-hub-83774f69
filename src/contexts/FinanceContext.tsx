import { createContext, useContext, useState, useEffect, ReactNode, useCallback, Dispatch, SetStateAction } from "react";
import {
  Categoria, TransacaoCompleta,
  DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
  ContaCorrente,
  FinanceExportV2,
  Emprestimo, // V2 Entity
  Veiculo, // V2 Entity
  SeguroVeiculo, // V2 Entity
  ObjetivoFinanceiro, // V2 Entity
  AccountType,
  DateRange, // Import new types
  ComparisonDateRanges, // Import new types
  generateAccountId,
  BillTracker, // NEW
  generateBillId, // NEW
  BillSourceType, // NEW
  StandardizationRule, // <-- NEW IMPORT
  generateRuleId, // <-- NEW IMPORT
  ImportedStatement, // <-- NEW IMPORT
  ImportedTransaction, // <-- NEW IMPORT
  generateStatementId, // <-- NEW IMPORT
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format, isWithinInterval } from "date-fns"; // Import date-fns helpers
import { parseDateLocal } from "@/lib/utils"; // Importando a nova função

// ============================================
// FUNÇÕES AUXILIARES PARA DATAS
// ============================================
// ... (rest of the file remains the same)