/**
 * Context schema indexer for performance optimization
 * Provides O(1) lookup for context variables and properties
 */

import type { ContextVariableSchema, ContextVariable } from '../config/types';
import { logger } from '../utils/logger';

/**
 * Indexed context schema for fast lookups
 */
export interface IndexedContextSchema {
  variableIndex: Map<string, ContextVariable>;
  propertyIndex: Map<string, Map<string, ContextVariable>>;
  schema: ContextVariableSchema;
}

/**
 * Create an indexed version of the context schema for fast lookups
 */
export function createContextIndex(schema: ContextVariableSchema): IndexedContextSchema {
  const startTime = performance.now();

  const variableIndex = new Map<string, ContextVariable>();
  const propertyIndex = new Map<string, Map<string, ContextVariable>>();

  // Index root-level variables
  schema.variables.forEach((variable) => {
    variableIndex.set(variable.name, variable);

    // Index properties of this variable
    if (variable.properties && variable.properties.length > 0) {
      const propMap = new Map<string, ContextVariable>();

      variable.properties.forEach((prop) => {
        // Create a pseudo-variable for this property
        const propVar: ContextVariable = {
          name: prop.name,
          type: prop.type,
          properties: [], // Would need schema lookup for nested types
          methods: [],
          documentation: prop.documentation,
        };
        propMap.set(prop.name, propVar);
      });

      propertyIndex.set(variable.name, propMap);
    }
  });

  const endTime = performance.now();
  const indexTime = endTime - startTime;

  logger.info('Context schema indexed', {
    variableCount: variableIndex.size,
    indexedVariables: Array.from(variableIndex.keys()),
    indexTime: `${indexTime.toFixed(2)}ms`,
  });

  return {
    variableIndex,
    propertyIndex,
    schema,
  };
}

/**
 * Get variable from index (O(1) lookup)
 */
export function getVariableFromIndex(
  index: IndexedContextSchema,
  variableName: string
): ContextVariable | undefined {
  return index.variableIndex.get(variableName);
}

/**
 * Get property from index (O(1) lookup)
 */
export function getPropertyFromIndex(
  index: IndexedContextSchema,
  variableName: string,
  propertyName: string
): ContextVariable | undefined {
  const propMap = index.propertyIndex.get(variableName);
  return propMap?.get(propertyName);
}

/**
 * Check if variable exists in index
 */
export function hasVariable(index: IndexedContextSchema, variableName: string): boolean {
  return index.variableIndex.has(variableName);
}

/**
 * Get all properties of a variable
 */
export function getVariableProperties(
  index: IndexedContextSchema,
  variableName: string
): ContextVariable[] {
  const propMap = index.propertyIndex.get(variableName);
  return propMap ? Array.from(propMap.values()) : [];
}

/**
 * Filter variables by prefix (optimized)
 */
export function filterVariablesByPrefix(
  index: IndexedContextSchema,
  prefix: string
): ContextVariable[] {
  if (!prefix) {
    return Array.from(index.variableIndex.values());
  }

  const lowerPrefix = prefix.toLowerCase();
  const results: ContextVariable[] = [];

  for (const [name, variable] of index.variableIndex) {
    if (name.toLowerCase().startsWith(lowerPrefix)) {
      results.push(variable);
    }
  }

  return results;
}

/**
 * Filter properties by prefix (optimized)
 */
export function filterPropertiesByPrefix(
  index: IndexedContextSchema,
  variableName: string,
  prefix: string
): ContextVariable[] {
  const propMap = index.propertyIndex.get(variableName);
  if (!propMap) {
    return [];
  }

  if (!prefix) {
    return Array.from(propMap.values());
  }

  const lowerPrefix = prefix.toLowerCase();
  const results: ContextVariable[] = [];

  for (const [name, prop] of propMap) {
    if (name.toLowerCase().startsWith(lowerPrefix)) {
      results.push(prop);
    }
  }

  return results;
}
