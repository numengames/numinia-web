/** Shared prop shapes for the sheet island — options arrive pre-localized
    from the Astro page so the island ships no domain tables. */

interface Option {
  readonly id: string;
  readonly label: string;
}

interface HouseOption extends Option {
  readonly branchId: string;
}

interface BranchOption extends Option {
  readonly guildId: string;
  readonly houses: readonly HouseOption[];
}

interface GuildOption extends Option {
  readonly branches: readonly BranchOption[];
}

export interface SheetOptions {
  readonly species: readonly Option[];
  readonly positions: readonly Option[];
  readonly guilds: readonly GuildOption[];
  readonly factions: readonly Option[];
  readonly districts: readonly Option[];
  readonly archetypes: readonly Option[];
  readonly humors: readonly Option[];
  readonly competences: readonly Option[];
}

export interface SheetLabels {
  readonly title: string;
  readonly fileNote: string;
  readonly edit: string;
  readonly done: string;
  readonly exportMd: string;
  readonly exportPdf: string;
  readonly importMd: string;
  readonly importError: string;
  readonly importConfirm: string;
  readonly wipe: string;
  readonly wipeConfirm: string;
  readonly roll: string;
  readonly total: string;
  readonly none: string;
  readonly identity: string;
  readonly attributes: string;
  readonly attributeBounds: string;
  readonly values: string;
  readonly competences: string;
  readonly competenceHint: string;
  readonly disabledCompetence: string;
  readonly strayPoints: string;
  readonly aptitudes: string;
  readonly aptitudeName: string;
  readonly aptitudePool: string;
  readonly incompatiblePosition: string;
  readonly positionBonus: string;
  readonly initialValue: string;
  readonly fromPerception: string;
  readonly desequilibrium: string;
  readonly desequilibriumNote: string;
  readonly gearOf: string;
  readonly profile: string;
  readonly notes: string;
  readonly fields: Readonly<Record<string, string>>;
}
