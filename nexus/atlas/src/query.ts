/**
 * Atlas Query Engine
 * Standard: NASA-Grade L4
 *
 * Provides filtering, sorting, and pagination for views
 */

import type {
  AtlasView,
  AtlasQuery,
  AtlasResult,
  QueryFilter,
  FilterOperator,
  SortSpec,
} from './types.js';
import {
  AtlasQueryInvalidFilterError,
  AtlasQueryInvalidOperatorError,
} from './errors.js';

// ============================================================
// Filter Implementation
// ============================================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function applyOperator(
  fieldValue: unknown,
  operator: FilterOperator,
  filterValue: unknown
): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === filterValue;

    case 'ne':
      return fieldValue !== filterValue;

    case 'gt':
      if (typeof fieldValue !== 'number' || typeof filterValue !== 'number') {
        return false;
      }
      return fieldValue > filterValue;

    case 'gte':
      if (typeof fieldValue !== 'number' || typeof filterValue !== 'number') {
        return false;
      }
      return fieldValue >= filterValue;

    case 'lt':
      if (typeof fieldValue !== 'number' || typeof filterValue !== 'number') {
        return false;
      }
      return fieldValue < filterValue;

    case 'lte':
      if (typeof fieldValue !== 'number' || typeof filterValue !== 'number') {
        return false;
      }
      return fieldValue <= filterValue;

    case 'in':
      if (!Array.isArray(filterValue)) {
        return false;
      }
      return filterValue.includes(fieldValue);

    case 'nin':
      if (!Array.isArray(filterValue)) {
        return false;
      }
      return !filterValue.includes(fieldValue);

    case 'contains':
      if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
        return false;
      }
      return fieldValue.includes(filterValue);

    case 'startsWith':
      if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') {
        return false;
      }
      return fieldValue.startsWith(filterValue);

    case 'exists':
      return filterValue ? fieldValue !== undefined : fieldValue === undefined;

    default: {
      // Exhaustive check
      const _exhaustive: never = operator;
      throw new AtlasQueryInvalidOperatorError(`Unknown operator: ${_exhaustive}`);
    }
  }
}

function matchesFilter(view: AtlasView, filter: QueryFilter): boolean {
  // Check if field is in data or top-level
  let fieldValue: unknown;

  if (filter.field === 'id' || filter.field === 'timestamp' || filter.field === 'version') {
    fieldValue = view[filter.field as keyof AtlasView];
  } else if (filter.field.startsWith('data.')) {
    fieldValue = getNestedValue(view.data, filter.field.slice(5));
  } else {
    fieldValue = getNestedValue(view.data, filter.field);
  }

  return applyOperator(fieldValue, filter.operator, filter.value);
}

// ============================================================
// Sort Implementation
// ============================================================

function compareValues(a: unknown, b: unknown): number {
  // Handle undefined/null
  if (a === undefined || a === null) {
    return b === undefined || b === null ? 0 : 1;
  }
  if (b === undefined || b === null) {
    return -1;
  }

  // String comparison
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  // Number comparison
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // Boolean comparison
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? 1 : -1;
  }

  // Fallback to string comparison
  return String(a).localeCompare(String(b));
}

function sortViews(views: AtlasView[], sort: SortSpec): AtlasView[] {
  const sorted = [...views];

  sorted.sort((a, b) => {
    let aValue: unknown;
    let bValue: unknown;

    if (sort.field === 'id' || sort.field === 'timestamp' || sort.field === 'version') {
      aValue = a[sort.field as keyof AtlasView];
      bValue = b[sort.field as keyof AtlasView];
    } else if (sort.field.startsWith('data.')) {
      aValue = getNestedValue(a.data, sort.field.slice(5));
      bValue = getNestedValue(b.data, sort.field.slice(5));
    } else {
      aValue = getNestedValue(a.data, sort.field);
      bValue = getNestedValue(b.data, sort.field);
    }

    const comparison = compareValues(aValue, bValue);
    return sort.direction === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

// ============================================================
// Query Execution
// ============================================================

export function executeQuery(
  views: readonly AtlasView[],
  query: AtlasQuery
): AtlasResult {
  let result = [...views];

  // Apply filter
  if (query.filter) {
    result = result.filter((view) => matchesFilter(view, query.filter!));
  }

  const total = result.length;

  // Apply sort
  if (query.sort) {
    result = sortViews(result, query.sort);
  } else {
    // Default sort by timestamp (stable, deterministic)
    result = sortViews(result, { field: 'timestamp', direction: 'asc' });
  }

  // Apply pagination
  const offset = query.offset ?? 0;
  const limit = query.limit ?? result.length;

  const paginatedViews = result.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return Object.freeze({
    views: Object.freeze(paginatedViews),
    total,
    hasMore,
  });
}

// ============================================================
// Query Validation
// ============================================================

const VALID_OPERATORS: readonly FilterOperator[] = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'in', 'nin', 'contains', 'startsWith', 'exists',
];

export function validateQuery(query: AtlasQuery): void {
  if (query.filter) {
    if (!query.filter.field || typeof query.filter.field !== 'string') {
      throw new AtlasQueryInvalidFilterError('Filter field must be a non-empty string', {
        filter: query.filter,
      });
    }

    if (!VALID_OPERATORS.includes(query.filter.operator)) {
      throw new AtlasQueryInvalidOperatorError(
        `Invalid operator: ${query.filter.operator}`,
        { operator: query.filter.operator, validOperators: VALID_OPERATORS }
      );
    }
  }

  if (query.limit !== undefined && (typeof query.limit !== 'number' || query.limit < 0)) {
    throw new AtlasQueryInvalidFilterError('Limit must be a non-negative number', {
      limit: query.limit,
    });
  }

  if (query.offset !== undefined && (typeof query.offset !== 'number' || query.offset < 0)) {
    throw new AtlasQueryInvalidFilterError('Offset must be a non-negative number', {
      offset: query.offset,
    });
  }
}
