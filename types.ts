
export interface TrainingSession {
  id: number;
  team: string;
  coach: string;
  day: string;
  gym: string;
  courts: string[];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}
