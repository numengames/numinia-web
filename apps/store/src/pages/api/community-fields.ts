/**
 * Card t_371c917d (2026-10-18): a community's house override, public — the
 * name or summary the Oracle wrote over the register's file, for the
 * community's own page to show on load. GET `?comunidad=`, answers `{ ok,
 * fields }`; `fields` is null while nobody has edited it.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../lib/accounts-source';
import { answerCommunityFields } from '../../lib/community-fields';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ url }) => answerCommunityFields(desk(), url);
