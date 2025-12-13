import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma string YYYY-MM-DD em um objeto Date, forçando a interpretação no fuso horário local.
 * Isso evita o problema de deslocamento de 1 dia que ocorre quando o JS interpreta YYYY-MM-DD como UTC.
 * @param dateString A string da data no formato YYYY-MM-DD.
 * @returns Objeto Date representando o início do dia local.
 */
export function parseDateLocal(dateString: string): Date {
  if (!dateString || dateString.length < 10) {
    // Retorna a data atual ou uma data inválida se a string for inválida
    return new Date(dateString);
  }
  const [year, month, day] = dateString.split('-').map(Number);
  // Cria a data usando componentes, forçando a interpretação local
  // Nota: month - 1 é necessário porque o mês é 0-indexado
  return new Date(year, month - 1, day);
}