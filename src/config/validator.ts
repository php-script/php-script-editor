/**
 * Configuration validation logic for php-script Monaco Editor
 */

import type {
  ContextVariable,
  ValidationError,
  ValidationResult,
} from './types';

/**
 * Validate a complete configuration bundle
 */
export function validateConfigurationBundle(bundle: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!bundle || typeof bundle !== 'object') {
    errors.push({
      field: 'bundle',
      message: 'Configuration bundle must be an object',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  const config = bundle as Record<string, unknown>;

  // Validate required fields exist
  if (!config.languageDefinition) {
    errors.push({
      field: 'languageDefinition',
      message: 'Language definition is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateLanguageDefinition(config.languageDefinition));
  }

  if (!config.functionWhitelist) {
    errors.push({
      field: 'functionWhitelist',
      message: 'Function whitelist is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateFunctionWhitelist(config.functionWhitelist));
  }

  if (!config.contextSchema) {
    errors.push({
      field: 'contextSchema',
      message: 'Context schema is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateContextSchema(config.contextSchema));
  }

  // Validate bundleVersion (semver)
  if (!config.bundleVersion || typeof config.bundleVersion !== 'string') {
    errors.push({
      field: 'bundleVersion',
      message: 'Bundle version must be a valid semver string',
      severity: 'error',
    });
  } else if (!isValidSemver(config.bundleVersion)) {
    errors.push({
      field: 'bundleVersion',
      message: `Invalid semver format: ${config.bundleVersion}`,
      severity: 'error',
    });
  }

  // Validate compatibility
  if (config.compatibility && typeof config.compatibility === 'object') {
    const compat = config.compatibility as Record<string, unknown>;
    if (compat.minEditorVersion && !isValidSemver(compat.minEditorVersion as string)) {
      errors.push({
        field: 'compatibility.minEditorVersion',
        message: 'Invalid semver format for minEditorVersion',
        severity: 'error',
      });
    }
  }

  // Validate metadata
  if (config.metadata && typeof config.metadata === 'object') {
    const meta = config.metadata as Record<string, unknown>;
    if (meta.generatedAt && !isValidISO8601(meta.generatedAt as string)) {
      errors.push({
        field: 'metadata.generatedAt',
        message: 'Invalid ISO 8601 timestamp format',
        severity: 'warning',
      });
    }
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Validate language definition
 */
function validateLanguageDefinition(langDef: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!langDef || typeof langDef !== 'object') {
    errors.push({
      field: 'languageDefinition',
      message: 'Language definition must be an object',
      severity: 'error',
    });
    return errors;
  }

  const def = langDef as Record<string, unknown>;

  // Validate languageId
  if (!def.languageId || typeof def.languageId !== 'string') {
    errors.push({
      field: 'languageDefinition.languageId',
      message: 'Language ID must be a non-empty string',
      severity: 'error',
    });
  } else if (!/^[a-z][a-z0-9-]*$/.test(def.languageId)) {
    errors.push({
      field: 'languageDefinition.languageId',
      message: 'Language ID must match pattern ^[a-z][a-z0-9-]*$',
      severity: 'error',
    });
  }

  // Validate monarchDefinition
  if (!def.monarchDefinition || typeof def.monarchDefinition !== 'object') {
    errors.push({
      field: 'languageDefinition.monarchDefinition',
      message: 'Monarch definition must be an object',
      severity: 'error',
    });
  } else {
    const monarch = def.monarchDefinition as Record<string, unknown>;
    if (!monarch.tokenizer || typeof monarch.tokenizer !== 'object') {
      errors.push({
        field: 'languageDefinition.monarchDefinition.tokenizer',
        message: 'Tokenizer must be an object',
        severity: 'error',
      });
    } else {
      const tokenizer = monarch.tokenizer as Record<string, unknown>;
      if (!tokenizer.root) {
        errors.push({
          field: 'languageDefinition.monarchDefinition.tokenizer.root',
          message: 'Tokenizer must contain at least a "root" state',
          severity: 'error',
        });
      }
    }
  }

  // Validate fileExtensions
  if (!Array.isArray(def.fileExtensions) || def.fileExtensions.length === 0) {
    errors.push({
      field: 'languageDefinition.fileExtensions',
      message: 'File extensions must be a non-empty array',
      severity: 'error',
    });
  } else {
    def.fileExtensions.forEach((ext, idx) => {
      if (typeof ext !== 'string' || !ext.startsWith('.')) {
        errors.push({
          field: `languageDefinition.fileExtensions[${idx}]`,
          message: 'File extension must start with a dot',
          severity: 'error',
        });
      }
    });
  }

  return errors;
}

/**
 * Validate function whitelist
 */
function validateFunctionWhitelist(whitelist: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!whitelist || typeof whitelist !== 'object') {
    errors.push({
      field: 'functionWhitelist',
      message: 'Function whitelist must be an object',
      severity: 'error',
    });
    return errors;
  }

  const wl = whitelist as Record<string, unknown>;

  if (!Array.isArray(wl.functions)) {
    errors.push({
      field: 'functionWhitelist.functions',
      message: 'Functions must be an array',
      severity: 'error',
    });
  } else {
    const functionNames = new Set<string>();
    wl.functions.forEach((fn: unknown, idx) => {
      if (!fn || typeof fn !== 'object') {
        errors.push({
          field: `functionWhitelist.functions[${idx}]`,
          message: 'Function definition must be an object',
          severity: 'error',
        });
        return;
      }

      const func = fn as Record<string, unknown>;

      // Validate name
      if (!func.name || typeof func.name !== 'string') {
        errors.push({
          field: `functionWhitelist.functions[${idx}].name`,
          message: 'Function name must be a non-empty string',
          severity: 'error',
        });
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(func.name)) {
        errors.push({
          field: `functionWhitelist.functions[${idx}].name`,
          message: 'Function name must match pattern ^[a-zA-Z_][a-zA-Z0-9_]*$',
          severity: 'error',
        });
      } else if (functionNames.has(func.name)) {
        errors.push({
          field: `functionWhitelist.functions[${idx}].name`,
          message: `Duplicate function name: ${func.name}`,
          severity: 'error',
        });
      } else {
        functionNames.add(func.name);
      }

      // Validate signature
      if (func.signature && typeof func.signature === 'object') {
        const sig = func.signature as Record<string, unknown>;
        if (Array.isArray(sig.parameters)) {
          let foundOptional = false;
          sig.parameters.forEach((param: unknown, paramIdx) => {
            if (param && typeof param === 'object') {
              const p = param as Record<string, unknown>;
              if (p.optional && !foundOptional) {
                foundOptional = true;
              } else if (!p.optional && foundOptional) {
                errors.push({
                  field: `functionWhitelist.functions[${idx}].signature.parameters[${paramIdx}]`,
                  message: 'Optional parameters must come after required parameters',
                  severity: 'error',
                });
              }
            }
          });
        }
      }
    });
  }

  return errors;
}

/**
 * Validate context variable schema
 */
function validateContextSchema(schema: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push({
      field: 'contextSchema',
      message: 'Context schema must be an object',
      severity: 'error',
    });
    return errors;
  }

  const cs = schema as Record<string, unknown>;

  if (!Array.isArray(cs.variables)) {
    errors.push({
      field: 'contextSchema.variables',
      message: 'Variables must be an array',
      severity: 'error',
    });
  } else {
    const variableNames = new Set<string>();
    cs.variables.forEach((variable: unknown, idx) => {
      if (!variable || typeof variable !== 'object') {
        errors.push({
          field: `contextSchema.variables[${idx}]`,
          message: 'Variable definition must be an object',
          severity: 'error',
        });
        return;
      }

      const v = variable as ContextVariable;

      // Validate name
      if (!v.name || typeof v.name !== 'string') {
        errors.push({
          field: `contextSchema.variables[${idx}].name`,
          message: 'Variable name must be a non-empty string',
          severity: 'error',
        });
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v.name)) {
        errors.push({
          field: `contextSchema.variables[${idx}].name`,
          message: 'Variable name must match pattern ^[a-zA-Z_][a-zA-Z0-9_]*$',
          severity: 'error',
        });
      } else if (variableNames.has(v.name)) {
        errors.push({
          field: `contextSchema.variables[${idx}].name`,
          message: `Duplicate variable name: ${v.name}`,
          severity: 'error',
        });
      } else {
        variableNames.add(v.name);
      }

      // Check for circular references (simple depth check)
      if (v.properties) {
        const circularErrors = detectCircularReferences(v, new Set([v.name]), 0);
        errors.push(...circularErrors.map((msg) => ({
          field: `contextSchema.variables[${idx}]`,
          message: msg,
          severity: 'error' as const,
        })));
      }
    });
  }

  return errors;
}

/**
 * Detect circular references in context variables
 */
function detectCircularReferences(
  variable: ContextVariable,
  visited: Set<string>,
  depth: number
): string[] {
  const errors: string[] = [];

  if (depth > 10) {
    errors.push(`Nested object depth exceeds maximum of 10 levels`);
    return errors;
  }

  if (variable.properties) {
    variable.properties.forEach((prop) => {
      if (visited.has(prop.name)) {
        errors.push(`Circular reference detected: ${prop.name}`);
      } else if (prop.type.kind === 'object') {
        // For nested objects, we would need to recursively check
        // This is a simplified version
        visited.add(prop.name);
      }
    });
  }

  return errors;
}

/**
 * Validate semver format
 */
function isValidSemver(version: string): boolean {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Validate ISO 8601 timestamp format
 */
function isValidISO8601(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}
