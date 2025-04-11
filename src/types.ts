// Types for the temperature-guided reasoning implementation

export interface ReasoningStep {
  tokens: string[];
  temperatures: number[];
  hotTokens: string[];
  description: string;
  calculation: string;
  result: string;
  isComplete?: boolean;
}
