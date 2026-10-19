-- «MCP remoto», story W2 (2026-10-19): how an organization's AI was
-- connected. Besides the panel (whoever pastes a key or a token there), an AI
-- may now be connected from its own client — Claude, ChatGPT, Hermes — through
-- the house's MCP relay (mcp.numinia.com), which asks numinia.com for a token
-- agent on the person's consent. The row says which: `connected_via` is
-- 'panel', or 'mcp:' and the host the AI's client returns to (the redirect
-- URI's host the consent screen showed, e.g. 'mcp:claude.ai'). It is set when
-- the agent is created and again when its token is renewed (reconnecting the
-- same AI renews its token), and the organization's log carries it as
-- `detail.via` of the act that already exists for the change
-- (`agent-created`, `agent-token-created`, `agent-token-renewed`): no new act,
-- so `team_log` and its act list (0021) stay as they are — never the token,
-- never its hash.
--
-- One nullable column, added: no rebuild. NULL is an agent made before this
-- migration, every one of them through the panel. The CHECK keeps the same
-- alphabet the till reads (src/lib/agents.ts `readConnectedVia`): lower-case
-- letters, digits, dots and hyphens after 'mcp:', at most a DNS name long.

ALTER TABLE team_agents ADD COLUMN connected_via TEXT CHECK (
  connected_via IS NULL
  OR connected_via = 'panel'
  OR (
    substr(connected_via, 1, 4) = 'mcp:'
    AND length(connected_via) BETWEEN 5 AND 257
    AND length(trim(substr(connected_via, 5), 'abcdefghijklmnopqrstuvwxyz0123456789.-')) = 0
  )
);
