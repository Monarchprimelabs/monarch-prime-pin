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
export async function readHealthSteps(_days = 30): Promise<HealthPoint[]> {
  return [];
}

export type ExpandedHealth = {
  hrv: HealthPoint[];
  restingHeartRate: HealthPoint[];
  glucose: HealthPoint[];
  leanMass: HealthPoint[];
  waist: HealthPoint[];
  sleepByDay: Record<string, number>;
};

export async function requestExpandedHealth(): Promise<boolean> {
  return false;
}

export async function expandedHealthAsked(): Promise<boolean> {
  return false;
}

export async function readExpandedHealth(_days = 90): Promise<ExpandedHealth> {
  return { hrv: [], restingHeartRate: [], glucose: [], leanMass: [], waist: [], sleepByDay: {} };
}
