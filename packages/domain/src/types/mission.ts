/**
 * Missions — operational work units of the Operating System layer.
 * Missions are NOT Adventures (ADR-005): work in Huly, not game in Hyperfy.
 */

import type { GuildId } from './guild.js';

export const AGENT_TYPES = ['biological', 'digital', 'hybrid'] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const MISSION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type MissionPriority = (typeof MISSION_PRIORITIES)[number];

export const MISSION_EFFORTS = ['xs', 's', 'm', 'l', 'xl'] as const;
export type MissionEffort = (typeof MISSION_EFFORTS)[number];

export const MISSION_STATUSES = ['backlog', 'in-progress', 'in-review', 'done'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

/** Gherkin triplet — dual-agent readable acceptance (ADR-004). */
export interface AcceptanceCriterion {
  readonly given: string;
  readonly when: string;
  readonly then: string;
}

export interface Mission {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly storyStatement: string;
  readonly agentType: AgentType;
  readonly priority: MissionPriority;
  readonly effort: MissionEffort;
  readonly status: MissionStatus;
  readonly guildId?: GuildId;
  readonly acceptanceCriteria: readonly AcceptanceCriterion[];
}
