/**
 * PHASE J — POST-MORTEM GENERATOR
 * Specification: INCIDENT_PROCESS.md
 *
 * Generates post-mortem templates with mandatory fields.
 * INC-005: All MEDIUM+ incidents require post-mortem.
 * INV-J-08: No blame culture enforced.
 *
 * NON-ACTUATING: Generates templates only.
 */

import type {
  IncidentEvent,
  PostMortem,
  PreventiveAction,
  RootCauseCategory,
  ResolutionType,
  TimelineEntry
} from './types.js';
import { generatePostMortemId } from './incident_utils.js';

/**
 * Post-mortem generation options.
 */
export interface PostMortemGenerationOptions {
  readonly author: string;
  readonly summary: string;
  readonly rootCauseDescription: string;
  readonly rootCauseCategory: RootCauseCategory;
  readonly contributingFactors: readonly string[];
  readonly impactDescription: string;
  readonly dataLoss: boolean;
  readonly affectedUsersCount?: number;
  readonly serviceDowntimeMinutes?: number;
  readonly resolutionDescription: string;
  readonly resolutionType: ResolutionType;
  readonly resolvedBy: string;
  readonly actions: readonly PreventiveAction[];
  readonly lessonsLearned: readonly string[];
  readonly additionalTimeline?: readonly TimelineEntry[];
}

/**
 * Generate post-mortem from incident.
 * INC-005: Mandatory for MEDIUM+ incidents.
 * INV-J-08: Blame-free statement is auto-generated.
 */
export function generatePostMortem(
  incident: IncidentEvent,
  options: PostMortemGenerationOptions,
  createdAt: string
): PostMortem {
  const postmortemId = generatePostMortemId(incident.incident_id);

  // Build timeline from incident timeline + additional entries
  const timeline: TimelineEntry[] = [
    ...incident.timeline,
    ...(options.additionalTimeline ?? [])
  ];

  // INV-J-08: Standard blame-free statement
  const blameFreeStatement = generateBlameFreeStatement(incident);

  return {
    postmortem_id: postmortemId,
    incident_id: incident.incident_id,
    created_at: createdAt,
    author: options.author,

    summary: options.summary,
    timeline,
    root_cause: {
      description: options.rootCauseDescription,
      category: options.rootCauseCategory,
      contributing_factors: options.contributingFactors
    },
    impact: {
      description: options.impactDescription,
      affected_users_count: options.affectedUsersCount,
      data_loss: options.dataLoss,
      service_downtime_minutes: options.serviceDowntimeMinutes
    },
    resolution: {
      description: options.resolutionDescription,
      resolution_type: options.resolutionType,
      resolved_at: createdAt,
      resolved_by: options.resolvedBy
    },
    actions: options.actions,
    evidence_refs: [...incident.evidence_refs],

    blame_free_statement: blameFreeStatement,
    lessons_learned: options.lessonsLearned
  };
}

/**
 * Generate standard blame-free statement.
 * INV-J-08: No blame in post-mortem.
 */
export function generateBlameFreeStatement(incident: IncidentEvent): string {
  return `This post-mortem focuses on system improvements, not individual actions. ` +
    `Incident ${incident.incident_id} is analyzed to understand systemic factors and ` +
    `prevent recurrence. All team members acted in good faith with available information.`;
}

/**
 * Create empty post-mortem template.
 * Returns a template structure with placeholders.
 */
export function createPostMortemTemplate(
  incident: IncidentEvent,
  createdAt: string
): PostMortem {
  const postmortemId = generatePostMortemId(incident.incident_id);

  return {
    postmortem_id: postmortemId,
    incident_id: incident.incident_id,
    created_at: createdAt,
    author: '[REQUIRED: Author name]',

    summary: '[REQUIRED: Brief summary of the incident and its resolution]',
    timeline: [...incident.timeline],
    root_cause: {
      description: '[REQUIRED: Detailed root cause analysis]',
      category: 'unknown',
      contributing_factors: ['[REQUIRED: At least one contributing factor]']
    },
    impact: {
      description: '[REQUIRED: Impact description]',
      affected_users_count: undefined,
      data_loss: false,
      service_downtime_minutes: undefined
    },
    resolution: {
      description: '[REQUIRED: How the incident was resolved]',
      resolution_type: 'fix',
      resolved_at: '[REQUIRED: Resolution timestamp]',
      resolved_by: '[REQUIRED: Who resolved it]'
    },
    actions: [{
      action_id: 'ACTION_001',
      description: '[REQUIRED: At least one preventive action]',
      owner: '[REQUIRED: Action owner]',
      due_date: '[REQUIRED: Due date]',
      priority: 'medium',
      status: 'pending'
    }],
    evidence_refs: [...incident.evidence_refs],

    blame_free_statement: generateBlameFreeStatement(incident),
    lessons_learned: ['[REQUIRED: At least one lesson learned]']
  };
}

/**
 * Validate post-mortem completeness.
 * Checks all required fields are filled (not placeholders).
 */
export function isPostMortemComplete(postmortem: PostMortem): {
  complete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  // Check for placeholder patterns
  const placeholderPattern = /^\[REQUIRED:/;

  if (placeholderPattern.test(postmortem.author)) {
    missingFields.push('author');
  }
  if (placeholderPattern.test(postmortem.summary)) {
    missingFields.push('summary');
  }
  if (placeholderPattern.test(postmortem.root_cause.description)) {
    missingFields.push('root_cause.description');
  }
  if (postmortem.root_cause.contributing_factors.some(f => placeholderPattern.test(f))) {
    missingFields.push('root_cause.contributing_factors');
  }
  if (placeholderPattern.test(postmortem.impact.description)) {
    missingFields.push('impact.description');
  }
  if (placeholderPattern.test(postmortem.resolution.description)) {
    missingFields.push('resolution.description');
  }
  if (placeholderPattern.test(postmortem.resolution.resolved_at)) {
    missingFields.push('resolution.resolved_at');
  }
  if (placeholderPattern.test(postmortem.resolution.resolved_by)) {
    missingFields.push('resolution.resolved_by');
  }
  if (postmortem.actions.some(a => placeholderPattern.test(a.description))) {
    missingFields.push('actions');
  }
  if (postmortem.lessons_learned.some(l => placeholderPattern.test(l))) {
    missingFields.push('lessons_learned');
  }

  return {
    complete: missingFields.length === 0,
    missingFields
  };
}

/**
 * Generate action ID.
 */
export function generateActionId(index: number): string {
  return `ACTION_${String(index + 1).padStart(3, '0')}`;
}

/**
 * Create preventive action.
 */
export function createPreventiveAction(
  index: number,
  description: string,
  owner: string,
  dueDate: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
): PreventiveAction {
  return {
    action_id: generateActionId(index),
    description,
    owner,
    due_date: dueDate,
    priority,
    status: 'pending'
  };
}
