/**
 * Guided Sequence of Thought (GSoT) implementation
 * Based on the "Guidance is All You Need" paper
 */
import { TokenTemperatureMechanism } from './TokenTemperatureMechanism';
import { ReasoningStep } from '../types';

export class GuidedSequenceOfThought {
  private ttm: TokenTemperatureMechanism;
  private temperatureThreshold: number;
  
  constructor(ttm: TokenTemperatureMechanism, threshold: number = 0.5) {
    this.ttm = ttm;
    this.temperatureThreshold = threshold;
  }
  
  // Generate reasoning path based on temperature-guided attention
  generateReasoningPath(problem: string, maxSteps: number = 10): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    const tokens = this.tokenize(problem);
    
    // Initial temperature calculation
    const initialTemps = this.ttm.calculateTemperatures(tokens);
    const regulatedTemps = this.ttm.regulateTemperatures(initialTemps);
    
    // Identify hot tokens for the first reasoning step
    const hotTokenIndices = this.getHotTokenIndices(regulatedTemps);
    const hotTokens = hotTokenIndices.map(i => tokens[i]);
    
    // Initial state
    let currentState: ReasoningStep = {
      tokens,
      temperatures: regulatedTemps,
      hotTokens,
      description: "Initial problem analysis",
      calculation: "",
      result: ""
    };
    
    steps.push(currentState);
    
    // Generate subsequent reasoning steps
    for (let i = 1; i < maxSteps; i++) {
      // Simulate reasoning progress
      const nextState = this.simulateNextReasoningStep(currentState, i);
      
      // Check if reasoning is complete
      if (nextState.isComplete) {
        steps.push(nextState);
        break;
      }
      
      steps.push(nextState);
      currentState = nextState;
      
      // Apply adaptive temperature adjustment
      currentState.temperatures = this.adaptTemperatures(
        currentState.temperatures, 
        currentState.calculation
      );
    }
    
    return steps;
  }
  
  private tokenize(text: string): string[] {
    // Simple tokenization by whitespace and punctuation
    return text.replace(/[.,?!;()]/g, ' ')
               .split(/\s+/)
               .filter(t => t.length > 0);
  }
  
  private getHotTokenIndices(temperatures: number[]): number[] {
    // Select tokens with temperature above threshold
    return temperatures
      .map((temp, idx) => ({ temp, idx }))
      .filter(item => item.temp > this.temperatureThreshold)
      .map(item => item.idx);
  }
  
  private simulateNextReasoningStep(
    prevState: ReasoningStep, 
    stepIndex: number
  ): ReasoningStep {
    // Simulate reasoning based on hot tokens from previous step
    const hotTokenSet = new Set(prevState.hotTokens);
    
    // Extract numbers from hot tokens
    const numbers = prevState.hotTokens
      .map(token => parseFloat(token))
      .filter(num => !isNaN(num));
    
    // Extract operations from hot tokens
    const hasAddition = hotTokenSet.has("add") || hotTokenSet.has("plus") || hotTokenSet.has("sum");
    const hasSubtraction = hotTokenSet.has("subtract") || hotTokenSet.has("minus");
    const hasMultiplication = hotTokenSet.has("multiply") || hotTokenSet.has("times");
    const hasDivision = hotTokenSet.has("divide") || hotTokenSet.has("divided");
    const hasPercentage = hotTokenSet.has("percent") || hotTokenSet.has("%");
    
    // Determine operation to perform
    let calculation = "";
    let result = "";
    let description = "";
    
    if (numbers.length >= 2) {
      if (hasAddition) {
        calculation = `${numbers[0]} + ${numbers[1]}`;
        result = `${numbers[0] + numbers[1]}`;
        description = "Addition step";
      } else if (hasSubtraction) {
        calculation = `${numbers[0]} - ${numbers[1]}`;
        result = `${numbers[0] - numbers[1]}`;
        description = "Subtraction step";
      } else if (hasMultiplication) {
        calculation = `${numbers[0]} × ${numbers[1]}`;
        result = `${numbers[0] * numbers[1]}`;
        description = "Multiplication step";
      } else if (hasDivision) {
        calculation = `${numbers[0]} ÷ ${numbers[1]}`;
        result = `${numbers[0] / numbers[1]}`;
        description = "Division step";
      } else if (hasPercentage) {
        calculation = `${numbers[0]} × ${numbers[1]/100}`;
        result = `${numbers[0] * numbers[1]/100}`;
        description = "Percentage calculation";
      }
    }
    
    // Adjust token temperatures for next step
    const newTemperatures = [...prevState.temperatures];
    
    // Increase temperature for tokens related to the current operation
    for (let i = 0; i < prevState.tokens.length; i++) {
      const token = prevState.tokens[i];
      
      // Increase temperature for operation tokens that were used
      if ((hasAddition && (token === "add" || token === "plus" || token === "sum")) ||
          (hasSubtraction && (token === "subtract" || token === "minus")) ||
          (hasMultiplication && (token === "multiply" || token === "times")) ||
          (hasDivision && (token === "divide" || token === "divided"))) {
        newTemperatures[i] = Math.min(newTemperatures[i] + 0.2, 0.95);
      }
      
      // Decay temperatures for tokens that were already processed
      if (prevState.hotTokens.includes(token)) {
        newTemperatures[i] = Math.max(newTemperatures[i] - 0.1, 0.05);
      }
    }
    
    // Check if reasoning is complete (simple heuristic)
    const isComplete = stepIndex >= 3 || 
                       (result !== "" && 
                        !hasAddition && !hasSubtraction && 
                        !hasMultiplication && !hasDivision);
    
    if (isComplete) {
      description = "Final result calculation";
    }
    
    // Get new hot tokens based on adjusted temperatures
    const regulatedTemps = this.ttm.regulateTemperatures(newTemperatures);
    const hotTokenIndices = this.getHotTokenIndices(regulatedTemps);
    const hotTokens = hotTokenIndices.map(i => prevState.tokens[i]);
    
    return {
      tokens: prevState.tokens,
      temperatures: regulatedTemps,
      hotTokens,
      description,
      calculation,
      result,
      isComplete
    };
  }
  
  private adaptTemperatures(
    temperatures: number[], 
    calculation: string
  ): number[] {
    // Implement temperature adaptation based on calculation confidence
    // (Paper section 3.7 - Temperature Dynamics)
    
    // Simple implementation: If calculation is empty, boost exploration
    if (!calculation) {
      return temperatures.map(t => t * 0.9 + 0.05);
    }
    
    // Otherwise, maintain current distribution
    return temperatures;
  }
}
