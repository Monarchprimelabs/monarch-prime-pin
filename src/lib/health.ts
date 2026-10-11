// Android and web: Apple Health doesn't exist there.

export type HealthPoint = { date: string; at: string; value: number };

export function healthSupported(): boolean {
  return false;
}
export async function getHealthEnabled(): Promise<boolean> {
  return false;
}
export async function enableHealth(): Promise<boolean> {
  return false;
}
export async function disableHealth(): Promise<void> {
  return;
}
export async function readHealthWeights(_days = 365): Promise<HealthPoint[]> {
  return [];
}
export async function readHealthBodyFat(_days = 365): Promise<HealthPoint[]> {
  return [];
}
