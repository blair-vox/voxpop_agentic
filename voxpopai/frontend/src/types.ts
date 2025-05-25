export interface Persona {
  id: number;
  age: string;
  gender: string;
  location: string;
  response?: string;
  // allow any additional fields for flexibility
  [key: string]: any;
}

export interface DriverSummaryRow {
  level: number;
  drivers: [string, number][];
}

export interface Run {
  id?: string;
  run_id?: string;
  timestamp?: string;
  question?: string;
  area?: string | null;
  summary?: string;
  responses: Persona[];
  driver_summary?: DriverSummaryRow[];
  demographics?: any;
  persona_count?: number;
  location_freq?: Record<string, number>;
  [key: string]: any;
} 