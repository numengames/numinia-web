/**
 * Guild resolution — traverse the superordinate → basic → subordinate levels.
 */

import type {
  Branch,
  BranchId,
  Guild,
  GuildId,
  GuildPath,
  House,
  HouseId,
} from '../types/guild.js';
import { GUILDS } from '../constants/guilds.js';

export function getGuild(id: GuildId): Guild | undefined {
  return GUILDS.find((guild) => guild.id === id);
}

export function getBranch(id: BranchId): Branch | undefined {
  for (const guild of GUILDS) {
    const branch = guild.branches.find((candidate) => candidate.id === id);
    if (branch) return branch;
  }
  return undefined;
}

export function getHouse(id: HouseId): House | undefined {
  for (const guild of GUILDS) {
    for (const branch of guild.branches) {
      const house = branch.houses.find((candidate) => candidate.id === id);
      if (house) return house;
    }
  }
  return undefined;
}

/** Resolve the full hierarchy path from a house id. */
export function resolveGuildPath(houseId: HouseId): GuildPath | undefined {
  const house = getHouse(houseId);
  if (!house) return undefined;
  return { guildId: house.guildId, branchId: house.branchId, houseId: house.id };
}

export function listHousesOfGuild(guildId: GuildId): readonly House[] {
  const guild = getGuild(guildId);
  if (!guild) return [];
  return guild.branches.flatMap((branch) => branch.houses);
}
