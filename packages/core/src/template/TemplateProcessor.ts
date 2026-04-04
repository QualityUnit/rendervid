import type { Template, CustomComponentDefinition } from '../types';
import type { ComponentRegistry } from '../types/component';

/**
 * Template Processor
 *
 * Processes templates before rendering by:
 * 1. Loading custom components defined in template.customComponents
 * 2. Interpolating input variables using {{key}} syntax
 *
 * @example
 * ```typescript
 * const processor = new TemplateProcessor();
 *
 * // Load custom components
 * await processor.loadCustomComponents(template, registry);
 *
 * // Resolve input variables
 * const processedTemplate = processor.resolveInputs(template, { title: 'Hello' });
 * ```
 */
export class TemplateProcessor {
  /**
   * Load custom components from template into registry
   *
   * Processes template.customComponents and registers them with the provided registry.
   * Supports three types:
   * - 'reference': Creates alias to pre-registered component
   * - 'url': Loads component from HTTPS URL
   * - 'inline': Creates component from code string
   *
   * Components are loaded in parallel for performance.
   * Already registered components are skipped to prevent overwrites.
   *
   * @param template - Template containing customComponents definition
   * @param registry - Component registry to register components into
   * @throws Error if component loading fails
   *
   * @example
   * ```typescript
   * await processor.loadCustomComponents(template, registry);
   * // All components from template.customComponents are now available
   * ```
   */
  async loadCustomComponents(template: Template, registry: ComponentRegistry): Promise<void> {
    if (!template.customComponents) {
      return;
    }

    const loadPromises: Promise<void>[] = [];

    for (const [name, definition] of Object.entries(template.customComponents)) {
      // Unregister first so each template's component code is always applied,
      // even when multiple templates share the same component key (e.g. 'FlowHuntScene')
      // across a shared global registry.
      if (registry.has(name)) {
        registry.unregister(name);
      }

      loadPromises.push(this.loadComponent(name, definition, registry));
    }

    // Load all components in parallel
    await Promise.all(loadPromises);
  }

  /**
   * Load a single component from its definition
   *
   * @param name - Component name to register as
   * @param definition - Component definition (reference, url, or inline)
   * @param registry - Component registry to register into
   * @throws Error if component type is invalid or loading fails
   */
  private async loadComponent(
    name: string,
    definition: CustomComponentDefinition,
    registry: ComponentRegistry
  ): Promise<void> {
    switch (definition.type) {
      case 'reference': {
        if (!definition.reference) {
          throw new Error(`Reference missing for component "${name}"`);
        }

        // Get the referenced component
        const referencedComponent = registry.get(definition.reference);
        if (!referencedComponent) {
          throw new Error(
            `Referenced component "${definition.reference}" not found for "${name}". ` +
              `Make sure to register it before using this template.`
          );
        }

        // Create alias - register the same component under a new name
        // Note: We can't copy all metadata since the core ComponentRegistry interface
        // doesn't expose getMetadata. The concrete implementation in @rendervid/components
        // will handle this through its register method.
        registry.register(name, referencedComponent, definition.propsSchema);
        break;
      }

      case 'url': {
        if (!definition.url) {
          throw new Error(`URL missing for component "${name}"`);
        }

        await registry.registerFromUrl(name, definition.url);
        break;
      }

      case 'inline': {
        if (!definition.code) {
          throw new Error(`Code missing for component "${name}"`);
        }

        registry.registerFromCode(name, definition.code);
        break;
      }

      default: {
        throw new Error(
          `Unknown component type "${(definition as CustomComponentDefinition).type}" for "${name}"`
        );
      }
    }
  }

  /**
   * Resolve input variables in template
   *
   * Replaces all {{key}} placeholders in the template with actual values from inputs.
   * Works recursively through all objects, arrays, and strings in the template.
   *
   * Variable syntax: {{variableName}}
   * - Matches exact input keys
   * - Case-sensitive
   * - Missing variables are left unchanged
   *
   * @param template - Template with {{variable}} placeholders
   * @param inputs - Input values to interpolate
   * @returns New template with all variables resolved
   *
   * @example
   * ```typescript
   * const template = {
   *   name: 'Video',
   *   composition: {
   *     scenes: [{
   *       layers: [{
   *         type: 'text',
   *         text: '{{title}}',
   *         color: '{{color}}'
   *       }]
   *     }]
   *   }
   * };
   *
   * const resolved = processor.resolveInputs(template, {
   *   title: 'Hello World',
   *   color: '#ff0000'
   * });
   * // resolved.composition.scenes[0].layers[0].text === 'Hello World'
   * // resolved.composition.scenes[0].layers[0].color === '#ff0000'
   * ```
   */
  resolveInputs(template: Template, inputs: Record<string, unknown>): Template {
    // Deep clone template to avoid mutating original
    const cloned = JSON.parse(JSON.stringify(template));

    // Recursively interpolate all values
    return this.interpolateObject(cloned, inputs);
  }

  /**
   * Recursively interpolate variables in any object structure
   *
   * @param obj - Object to interpolate
   * @param inputs - Input values
   * @returns Interpolated object
   */
  private interpolateObject(obj: any, inputs: Record<string, unknown>): any {
    // Handle strings - replace {{key}} with values
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = inputs[key];

        // If value is undefined, leave the placeholder
        if (value === undefined) {
          return match;
        }

        // Convert value to string
        return String(value);
      });
    }

    // Handle arrays - interpolate each element
    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateObject(item, inputs));
    }

    // Handle objects - interpolate each property
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, inputs);
      }
      return result;
    }

    // Primitives (numbers, booleans, null) - return as-is
    return obj;
  }
}
