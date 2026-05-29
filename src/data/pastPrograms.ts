import {
  pastProgramCatalog,
  categoryColors,
  type PastProgram,
  type PastProgramSummary,
  type ProgramCategory,
  type HardwareDevice,
} from "./pastProgramCatalog";
import { pastProgramCode } from "./pastProgramCode";

export type { PastProgram, PastProgramSummary, ProgramCategory, HardwareDevice };
export { pastProgramCatalog, categoryColors };

export const pastPrograms: PastProgram[] = pastProgramCatalog.map((p) => ({
  ...p,
  code: pastProgramCode[p.id] ?? "",
}));

export function getProgramById(id: string): PastProgram | undefined {
  const summary = pastProgramCatalog.find((p) => p.id === id);
  if (!summary) return undefined;
  const code = pastProgramCode[id];
  if (!code) return undefined;
  return { ...summary, code };
}
