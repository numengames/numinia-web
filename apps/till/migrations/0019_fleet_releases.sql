-- The signed FleetRelease record the machines follow (fleet auto-update, story
-- S4, 2026-10-18; design: work/fleet-autoupdate/DISENO-FLEETRELEASE.md).
--
-- An Oracle signs a `FleetRelease` (EIP-712, domain «Numinia Fleet» v1) with
-- their wallet; the till keeps the signed record and numinia.com serves the
-- latest at /fleet/release.json. The till holds no key: the authority is the
-- signature, which each machine checks again against its own list of Oracles.
-- This table only refuses to go backwards: a record is accepted when its
-- `seq` is greater than every `seq` stored for that engine. Rows are only
-- ever added (the history is the audit trail), never changed or deleted.
--
-- `image` is '' for a pause (and `commit_sha` then is ''), otherwise the
-- engine's image by digest. (Numbered 0019 because 0018 is on main;
-- renumber at merge if another cut holds it.)

CREATE TABLE fleet_releases (
  engine TEXT NOT NULL CHECK (engine = 'numinia-engine'),
  seq INTEGER NOT NULL CHECK (seq >= 1),
  image TEXT NOT NULL CHECK (
    image = '' OR (
      length(image) = length('ghcr.io/numengames/numinia-engine@sha256:') + 64
      AND substr(image, 1, length('ghcr.io/numengames/numinia-engine@sha256:'))
        = 'ghcr.io/numengames/numinia-engine@sha256:'
      AND length(trim(substr(image, length('ghcr.io/numengames/numinia-engine@sha256:') + 1), '0123456789abcdef')) = 0
    )
  ),
  commit_sha TEXT NOT NULL CHECK (
    (image = '' AND commit_sha = '') OR (
      image <> '' AND length(commit_sha) BETWEEN 7 AND 40
      AND length(trim(commit_sha, '0123456789abcdef')) = 0
    )
  ),
  issued_at INTEGER NOT NULL CHECK (issued_at >= 0),
  signature TEXT NOT NULL CHECK (
    length(signature) = 132 AND substr(signature, 1, 2) = '0x'
    AND length(trim(substr(signature, 3), '0123456789abcdef')) = 0
  ),
  signer TEXT NOT NULL CHECK (
    length(signer) = 42 AND substr(signer, 1, 2) = '0x'
    AND length(trim(substr(signer, 3), '0123456789abcdef')) = 0
  ),
  published_by TEXT NOT NULL CHECK (
    length(published_by) = 42 AND substr(published_by, 1, 2) = '0x'
    AND length(trim(substr(published_by, 3), '0123456789abcdef')) = 0
  ),
  published_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', published_at) IS published_at),
  PRIMARY KEY (engine, seq)
) STRICT;
