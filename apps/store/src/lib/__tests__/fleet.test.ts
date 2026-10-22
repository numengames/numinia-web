/**
 * The room's side of the fleet's door, against a fake door: the requests it
 * builds (hashed against the digests the machine's own tests verify — the
 * same signatures, made by viem), the answers it reads and trusts only once
 * checked, and the calls, which never throw.
 */

import { hashTypedData, keccak256, recoverTypedDataAddress, stringToBytes } from 'viem';
import { describe, expect, it } from 'vitest';
import fixtureFleet from '../../../fixtures/worlds/fleet.json';
import {
  BEACON_MAX_EVENTS,
  BOOTSTRAP_URL,
  CODE_KINDS,
  FLEET_DOMAIN,
  DOOR_ERRORS,
  IMPORT_RULES,
  LAST_INSTALL_LINE,
  REQUEST_SECONDS,
  REQUEST_TYPES,
  SILENT_AFTER_S,
  SLOW_AFTER_S,
  VERSION_ID,
  VERSION_RULES,
  VERSION_KINDS,
  VERSION_PROBLEMS,
  isVersionKind,
  isVersionProblem,
  readVersionProblem,
  versionOutcome,
  type VersionOutcomeWords,
  versionNumber,
  beaconBody,
  bootstrapLine,
  buildRequest,
  copyDone,
  copyFileUrl,
  doorHost,
  doorUrl,
  formatAgo,
  formatBytes,
  formatCount,
  formatSize,
  gatherFleet,
  machineHealth,
  mergeLogs,
  newNonce,
  readAccepted,
  readCopy,
  readCopyStatus,
  readDoorLog,
  readDoorWorlds,
  readEngines,
  readHeartbeat,
  readImportRule,
  readImports,
  readListens,
  readMachine,
  readRecipe,
  readRecipeUpdate,
  readRequest,
  readRequestResult,
  readTickets,
  readUpdates,
  readVersionComing,
  readVersionId,
  readVersions,
  readVersionsSupport,
  recipeState,
  sendBeacon,
  sendRequest,
  settled,
  shortSha,
  shortWallet,
  typedData,
  uploadZip,
  waitFor,
  withTickets,
  type BeaconEvent,
  type DoorLogEntry,
  type FleetRequest,
  type Heartbeat,
  type ImportTicket,
  type MachineView,
  type VersionInfo,
} from '../fleet';
import type { WorldOrder } from '../worlds';

const IMAGE = 'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3';
/** A recipe a machine says it runs (any whole commit: the room compares it with none). */
const RECIPE = '4d2a9c0e7b18f3a65c90d1e2b7a4f86c3e05d9b1';
const EXPIRES = 1893456000;
/**
 * Copied verbatim from the fleet's shared vectors (numinia-assets
 * tests/fleet_vectors.json, made with viem by throwaway keys of which only
 * the public half is kept): every request kind with its digest, its signature
 * and its signer, a stranger's signature, the keccak checks and the house's
 * signed list of Oracles. The machine verifies the same file.
 */
const ORACLE = '0xfd36aa363e8f90303165b67ab03efb1bfb870e22';
const VECTORS = [
  {
    type: 'CreateWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      domain: 'plaza.numinia.com',
      image: 'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3',
      memory: '2g',
      cpus: '1.5',
      maxUploadMb: 50,
      nonce: '0123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x6390352cb3395b9e08c31daaec3288413a5800cef65a6569164809637382ca1d',
    signature:
      '0x8e81f2a7364dee0d091e7abc35118d1354511c4eba13ba5c462a0513a8dab9f1132dc59469c7bd8512a2b637df76c7fe18a0652ee0156655b8d50abb973492721c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'DeleteWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      domain: 'plaza.numinia.com',
      nonce: '1123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x4a05422e004fb6b333ed98bbc3d487bdbd231f0ebbf1e6d12516123f4f890a67',
    signature:
      '0xb3d87a45c3d0a9daeebf6dd371bab188af2b6ba7973ef9a8c5388f043c27cbb77ec3ae6a8b17db359944274a6fa074763ffc4adfa839c8088414cf80d6ecd6151c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'StopWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '2123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xcce8832bb8c525e8a94356bd6e02d9d3e39d4fa88b0d9cf49eff9e7eaf8965d1',
    signature:
      '0x19d23b378fa15e385925cd9edb65aaa566f9ea80fc17d4d7259297112bb3ebb4044b9d72ec9a6fd4d4fba11225234874e4a39f6f2bfe891ca506b95dce1222c21b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'StartWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '3123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xd84f2ea0aea5ef8176282fb8b08b92dfdc169109ed22205f2271d8c372d82a26',
    signature:
      '0xeaf29def4737dcdf71558942aa3833332c721c2c14187cf03f132d60048d859255e714ca4e4988a8ab9e9d5e13e8429fe46fae736951b6f1b0ffbcf01b21d7e31b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'DownloadWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '4123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xe03580fe93dd2192b20cd5fe6cba48e25020390d9e46e608440cfd5ec2651a27',
    signature:
      '0x1458a90d559606d9e618e438f37211cb744afe47d587d0a5ab76dd5df47079884f55630ae1a8375b3dfbf468a3893aa23fae3e3d29f28786b95eb21cbb6384b81b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'ShowAdminCode',
    message: { machine: 'open-1', nonce: '5123456789abcdef0123456789abcdef', expires: 1893456000 },
    digest: '0x026533a50e419d03f37105c6f319572c0500f9b65237935ac8670b8dd46ecfe9',
    signature:
      '0x766a663b546915ad1bb0c312f64822f06d9e447a28044cd3f8c7eb874e2b4ff57e06a8a5626320d972b71de6084244483ecd741d8b9aab15df9f2edc3433d5701c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'ShowWorldCode',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '6123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xf69173093218a76e67036e4059ad590d73a16d98de0532caf0ab55464aae3dfd',
    signature:
      '0xe0917e1b9cf3c126348b326d8415fb10dd9b6448ceaff3c87d6e56ed87efa1bd282ac71b48aa2793582b7f5cbeded0a7dfeab7f46d1ccbbcfa271ae2fd73492f1b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'RotateWorldCode',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '7123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x167365fbf09a8fbe0cd684c20bce0ea5e0ceb682a44775f09ebd45137ba1ed82',
    signature:
      '0x08ec95bb5468967a14d9f5a9ff97a64a4a38e529b7e9a903fd6608be00ee7c321511c6b9b39a65ca8a9373ee37697bac01c82c72e09e390197d2c0c4c82b98311b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'ImportWorld',
    message: {
      machine: 'open-1',
      world: 'plaza-copia',
      domain: 'plaza-copia.numinia.com',
      image: 'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3',
      memory: '2g',
      cpus: '1.5',
      maxUploadMb: 50,
      zipBytes: 50331648,
      zipSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      nonce: '8123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x772dc4f6286f22eca4f7eb4bcfc2d0211b060fb1417a9a19415feed1a4999ebe',
    signature:
      '0x11dc74caf7aec391ff3a5144fe4ecd79e1cec6be5c21799d572dfc3fcb7ddb6a5a5d51c578b178bed1a3708074c74ff8c94c5bc8ba97cd2a57aae01ebf0a8e331b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'UpdateWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      image: 'ghcr.io/numengames/numinia-engine:sha-c57dbb7cc4c51b0834184f1dd47b311e47fde234',
      nonce: '9123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x43cabdd5396fb9a42e85e9f001424dad6c43c5a282f9a1e075c700b9736ab598',
    signature:
      '0xa4ed8d364b4a19309f32941aaa23b0a12621a43607aebce6c5477836fb02f7ed469e362d13de2945b1330e91ca82e112efc294aa420836caeeb41ad07b87c8881b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'FleetRelease',
    message: {
      engine: 'numinia-engine',
      image:
        'ghcr.io/numengames/numinia-engine@sha256:abababababababababababababababababababababababababababababababab',
      commit: 'f4d8475a1c2e9b7d03665f8e1a4b2c9d7e6f5a43',
      seq: 7,
      issuedAt: 1893456000,
    },
    digest: '0xb577c6cc0d0fc62c3974dd3686d9e7c2e69f810d62a66625f851dd5a1c3f436b',
    signature:
      '0x83bb4f31766f2243d4c9048a2ccf4546d311b683b18383321fa1affb7be64a0e795b93b93b3d15200e11cfb4a202bdada5ef04205c6a3747619f620cf024467e1c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'PinWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      image: 'ghcr.io/numengames/numinia-engine:sha-f4d8475',
      reason: 'client demo until Friday',
      nonce: '9123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xf22c718fb4699360f01d365ae9a4c4dc67a4b54a33a6bea2194aed7a814806a8',
    signature:
      '0xc36bef64bbd0b3e2e534f99029e1f5567d9a983eea5c1cf656a1a5fa3d532bdf3246320b22cb4349b6adc548c6dee2681d77582e51e6c8d6ce6be94186321bb31c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'PinWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      image: '',
      reason: 'demo over',
      nonce: 'a123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xd6390dd7bd98b75943878cf7f3cac790a5ca9da764d1333e7437efe1f82474bf',
    signature:
      '0xbe20d225bf7b4a0f9d637b63fd8eafa885ecf405b37a52cfc891e99dd71fa8d42f328d3151a4c484eaa7f6e3861f29b4feef5cc83cac336804fb2c6201a5dc751c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'DuplicateVersion',
    message: {
      machine: 'open-1',
      world: 'plaza',
      version: 'v1',
      nonce: 'b123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x6473616a81ee5856ef76101f8debc65cfec203cf805abd20c2ac8eb8ca9baf7c',
    signature:
      '0x0d9bbde47cc68369f0c127d05945142551cab3a2759f93230f7c61fc390a9c0e64c556a893c28f82f6a4bd1f21afb39b5704b51ed3f13c408388f1ccdb875ffc1c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'PublishVersion',
    message: {
      machine: 'open-1',
      world: 'plaza',
      version: 'v2',
      nonce: 'c123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xfd1c1f252b40286e286d753b9e0009a067faf09872f97a0838002e57b610e6ab',
    signature:
      '0x61ec633880b8db0303c4eeafc4f87cd0d4c5b1528f4bf5178e20ed45bbf575f70a80a59d7841c275d83e62f4a75cf00d702aa5332057c56be958da357effc9ea1c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'DeleteVersion',
    message: {
      machine: 'open-1',
      world: 'plaza',
      version: 'v2',
      nonce: 'd123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x55359456e26dd74c0cb22b05d6d09494c6a91c11aa27b8c1428fe3d580c4d6c2',
    signature:
      '0x3cb51bcae56bf608e4f142a36c5caf1bf125da13e00f0a8a374ead374ec0888e4e875b50243aa8a2023c6c5cb3ed322a0b791d0ec5b576dfef9202a5f25a1a5e1b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'DownloadVersion',
    message: {
      machine: 'open-1',
      world: 'plaza',
      version: 'v1',
      nonce: 'e123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x9888f432d732e8f387134c340f101ef54617bd9c3dc34c5cc3a589161d101f3d',
    signature:
      '0x05973fbf29984b10aca1b1002dcc3964c199b7c5291b727c87654208a94436122f5d101896797d092aa70d31208b494174e643b66cfc6453027549ef48a024e31c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'ImportVersion',
    message: {
      machine: 'open-1',
      world: 'plaza',
      zipBytes: 2896,
      zipSha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      replace: '',
      nonce: 'f123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xdaed6cee11f52b3e439b09500d772a9daaed999c506cfed1597dc31cc48b24bc',
    signature:
      '0x23b8f65b7adb89749b2b59ca69f29da20b0a02b7599546fb975c10d45efcf87475a9a4c640a40eae8a4f4f1852e323d29934e96ba509335a4d15d74593ea13401c',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
  {
    type: 'ImportVersion',
    message: {
      machine: 'open-1',
      world: 'plaza',
      zipBytes: 50331648,
      zipSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      replace: 'v2',
      nonce: '0a23456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xc3e639a81190c9f90d4d7d04e705473ce61d8b45c2c3e9fd2556b4da189f1171',
    signature:
      '0xc8aea1aed891841338ba21d1cd60e015e51b97f96e8070537a99492de8fa365f638458f54de155980340a2c68c3a3dde24e1bbc29f04ab117de9181f9bdfea5a1b',
    signer: '0xfd36aa363e8f90303165b67ab03efb1bfb870e22',
  },
] as const;
const STRANGER = {
  type: 'StopWorld',
  message: {
    machine: 'open-1',
    world: 'plaza',
    nonce: '2123456789abcdef0123456789abcdef',
    expires: 1893456000,
  },
  signature:
    '0x80106580ce7005d1ba2dc50341c5416dda5fc9b033257650dee49b1ea4828d666ae90abef934798d22b6bed34e01a9578fcee7fb862b126266b1a1d7b8ebb5be1c',
  signer: '0xfe10a3f6a57fb674186895913553b44e9ec74063',
} as const;
const KECCAK = [
  { input: '', hex: '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470' },
  { input: 'abc', hex: '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45' },
  {
    input: 'Numinia Fleet',
    hex: '0xb16b402dbf9c3f6bbba1d461e221c2198f91541497686217ec102aaa34590238',
  },
  {
    input:
      'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    hex: '0x3c3800defb6a25a70a2737e0716eeb5d270559ad3cad8f6abddac58802d7158e',
  },
] as const;
/**
 * The house's signed list (GET /fleet/signers.json): signed by a fixed TEST
 * key that is public on purpose and holds nothing. `signed` is what the
 * wallet signs (the wallets joined with a comma); `wire` is what the
 * endpoint answers. Verbatim from the same file.
 */
const HOUSE = {
  $comment:
    'The house\'s signed list of Oracles and Archons (GET /fleet/signers.json), made with viem 2.x signTypedData by a fixed TEST key that is public on purpose and holds nothing: its address is the house in tests, never a real wallet. `wire` is the JSON the endpoint answers ({message:{signers:[…],seq,issuedAt},signature}); `signed` is what the wallet signs (signers joined with ","). `main` is the list; `fewer` is a newer list that drops the 3rd wallet; `older` is a validly signed list with a lower seq (replay).',
  privateKey: '0x1111111111111111111111111111111111111111111111111111111111111111',
  signer: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
  records: {
    main: {
      wire: {
        message: {
          signers: [
            '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
            '0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
            '0xc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3',
          ],
          seq: 1893456000,
          issuedAt: 1893456000,
        },
        signature:
          '0x90d1cce697d61ec624a5463375e276dbb02a6857c3f59e81c9cd95c910cc16e6064ae321c5bc1288ba514ac7224b668c755341ca5f693ff0f23a694c1bbff5131b',
      },
      signed: {
        signers:
          '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1,0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2,0xc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3',
        seq: 1893456000,
        issuedAt: 1893456000,
      },
      digest: '0x9e6e3e77e9b6e4fb6e7496b64d805054ce65f1fdea959768535f4c3dfaf631bd',
    },
    fewer: {
      wire: {
        message: {
          signers: [
            '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
            '0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
          ],
          seq: 1893456600,
          issuedAt: 1893456600,
        },
        signature:
          '0x332a0d67da522cabd3446936b9d6bbdb47edfd0b62271b5acca805e50bfbfa2702649f225c1875802476a56b7c21370530dc899b502ff3607dba572d15631ca91b',
      },
      signed: {
        signers:
          '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1,0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
        seq: 1893456600,
        issuedAt: 1893456600,
      },
      digest: '0x857eeb81b86b7317b5caf17dfe9a59901ed8b0cd87dfa4c0978c8cb4e3245ff5',
    },
    older: {
      wire: {
        message: {
          signers: [
            '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
            '0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
            '0xc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3',
          ],
          seq: 1893455000,
          issuedAt: 1893455000,
        },
        signature:
          '0xe443903856b211b0cf25f4c41c35d782891219e2961305c029c8797cf5802c463b561bb3393b5d8e41a5a9a0549ce5bbbf9ded959382b2e0c6cfef3345d2f8321c',
      },
      signed: {
        signers:
          '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1,0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2,0xc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3',
        seq: 1893455000,
        issuedAt: 1893455000,
      },
      digest: '0x5c6d282f28024ebc11d2a6d22b69817de3ae17bdd783dd061e94cecc48bdde8f',
    },
  },
} as const;

const NOW_MS = (EXPIRES - REQUEST_SECONDS) * 1000;

describe('the requests the room builds', () => {
  it('hashes every kind exactly as the machine does, and each signature recovers to its signer', async () => {
    expect([...new Set(VECTORS.map((vector) => vector.type))]).toEqual(Object.keys(REQUEST_TYPES));
    for (const vector of VECTORS) {
      const request: FleetRequest = { type: vector.type, message: vector.message };
      const data = typedData(request) as unknown as Parameters<typeof hashTypedData>[0];
      expect(hashTypedData(data)).toBe(vector.digest);
      const signer = await recoverTypedDataAddress({ ...data, signature: vector.signature });
      expect(signer.toLowerCase()).toBe(vector.signer);
      expect(vector.signer).toBe(ORACLE);
    }
  });

  it('recovers a stranger’s signature to the stranger, never to the Oracle', async () => {
    const request: FleetRequest = { type: STRANGER.type, message: STRANGER.message };
    const data = typedData(request) as unknown as Parameters<typeof hashTypedData>[0];
    // The very request the Oracle signed in the StopWorld vector, signed by someone else.
    expect(hashTypedData(data)).toBe(VECTORS[2].digest);
    const signer = await recoverTypedDataAddress({ ...data, signature: STRANGER.signature });
    expect(signer.toLowerCase()).toBe(STRANGER.signer);
    expect(signer.toLowerCase()).not.toBe(ORACLE);
  });

  it('hashes text with the keccak the machine checks its own against', () => {
    for (const { input, hex } of KECCAK) expect(keccak256(stringToBytes(input))).toBe(hex);
  });

  it('writes each request with the machine’s fields, in the type’s order, good for ten minutes', () => {
    const create = buildRequest(
      {
        kind: 'CreateWorld',
        machine: 'open-1',
        world: 'plaza',
        domain: 'plaza.numinia.com',
        image: IMAGE,
        memory: '2g',
        cpus: '1.5',
        maxUploadMb: 50,
      },
      VECTORS[0].message.nonce,
      NOW_MS + 999,
    );
    expect(create).toEqual({ type: 'CreateWorld', message: VECTORS[0].message });
    expect(Object.keys(create.message)).toEqual(REQUEST_TYPES.CreateWorld.map((f) => f.name));
    const del = buildRequest(
      { kind: 'DeleteWorld', machine: 'open-1', world: 'plaza', domain: 'plaza.numinia.com' },
      VECTORS[1].message.nonce,
      NOW_MS,
    );
    expect(del.message).toEqual(VECTORS[1].message);
    const code = buildRequest({ kind: 'ShowAdminCode', machine: 'open-1' }, 'n', NOW_MS);
    expect(code).toEqual({
      type: 'ShowAdminCode',
      message: { machine: 'open-1', nonce: 'n', expires: EXPIRES },
    });
    for (const kind of ['StopWorld', 'StartWorld', 'DownloadWorld'] as const) {
      expect(
        Object.keys(buildRequest({ kind, machine: 'open-1', world: 'w' }, 'n', NOW_MS).message),
      ).toEqual(['machine', 'world', 'nonce', 'expires']);
    }
    // A world's own code, shown or changed: the machine, the world, the number, the expiry.
    const show = buildRequest(
      { kind: 'ShowWorldCode', machine: 'open-1', world: 'plaza' },
      VECTORS[6].message.nonce,
      NOW_MS,
    );
    expect(show).toEqual({ type: 'ShowWorldCode', message: VECTORS[6].message });
    expect(Object.keys(show.message)).toEqual(REQUEST_TYPES.ShowWorldCode.map((f) => f.name));
    const rotate = buildRequest(
      { kind: 'RotateWorldCode', machine: 'open-1', world: 'plaza' },
      VECTORS[7].message.nonce,
      NOW_MS,
    );
    expect(rotate).toEqual({ type: 'RotateWorldCode', message: VECTORS[7].message });
    expect(Object.keys(rotate.message)).toEqual(['machine', 'world', 'nonce', 'expires']);
    // A world from its zip: CreateWorld's fields, then the zip's exact size and fingerprint.
    const zip = buildRequest(
      {
        kind: 'ImportWorld',
        machine: 'open-1',
        world: 'plaza-copia',
        domain: 'plaza-copia.numinia.com',
        image: IMAGE,
        memory: '2g',
        cpus: '1.5',
        maxUploadMb: 50,
        zipBytes: 50331648,
        zipSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      },
      VECTORS[8].message.nonce,
      NOW_MS,
    );
    expect(zip).toEqual({ type: 'ImportWorld', message: VECTORS[8].message });
    expect(Object.keys(zip.message)).toEqual([
      'machine',
      'world',
      'domain',
      'image',
      'memory',
      'cpus',
      'maxUploadMb',
      'zipBytes',
      'zipSha256',
      'nonce',
      'expires',
    ]);
    const zipData = typedData(zip);
    expect(zipData.message['zipBytes']).toBe(50331648n);
    expect(zipData.message['zipSha256']).toBe(VECTORS[8].message.zipSha256);
    // Another build of a world's own engine: the machine, the world, the image, the number, the expiry.
    const update = buildRequest(
      { kind: 'UpdateWorld', machine: 'open-1', world: 'plaza', image: VECTORS[9].message.image },
      VECTORS[9].message.nonce,
      NOW_MS,
    );
    expect(update).toEqual({ type: 'UpdateWorld', message: VECTORS[9].message });
    expect(Object.keys(update.message)).toEqual(['machine', 'world', 'image', 'nonce', 'expires']);
    // The answers that are a code: what the room waits for after the machine takes them.
    expect(CODE_KINDS).toEqual(['ShowAdminCode', 'ShowWorldCode', 'RotateWorldCode']);
  });

  it('gives the wallet whole numbers as bigints and everything else as text', () => {
    const data = typedData({ type: 'CreateWorld', message: VECTORS[0].message });
    expect(data.domain).toEqual({ name: 'Numinia Fleet', version: '1' });
    expect(data.primaryType).toBe('CreateWorld');
    expect(Object.keys(data.types)).toEqual(['CreateWorld']);
    expect(data.message['maxUploadMb']).toBe(50n);
    expect(data.message['expires']).toBe(BigInt(EXPIRES));
    expect(data.message['cpus']).toBe('1.5');
  });

  it('numbers each request with 128 random bits', () => {
    expect(newNonce((bytes) => bytes.fill(171))).toBe('ab'.repeat(16));
    const a = newNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newNonce()).not.toBe(a);
  });
});

describe('addresses and small words', () => {
  it('finds each machine’s door at its own name', () => {
    expect(doorHost('open-1')).toBe('open-1.numinia.com');
    expect(doorUrl('open-1', 'worlds')).toBe('https://open-1.numinia.com/fleet/v1/worlds');
    expect(copyFileUrl('open-1', 'c'.repeat(32))).toBe(
      `https://open-1.numinia.com/fleet/v1/copies/${'c'.repeat(32)}/file`,
    );
  });

  it('fetches the bootstrap from main, never a fixed commit, and carries the Oracle’s wallet', () => {
    expect(BOOTSTRAP_URL).toBe(
      'https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds/machine/bootstrap.sh',
    );
    expect(bootstrapLine('open-2', '0xabc')).toBe(
      'curl -fsSL https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds/machine/bootstrap.sh | sudo bash -s -- open-2 0xabc',
    );
    // No pinned recipe: the machine installs main and then follows it by itself.
    expect(bootstrapLine('open-2', '0xabc')).not.toContain('FLEET_REF');
    // The last install of a machine older than that reads its own alias and keeps its wallets.
    expect(LAST_INSTALL_LINE).toBe(
      'curl -fsSL https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds/machine/bootstrap.sh | sudo bash -s -- "$(cat /etc/fleet/alias)"',
    );
    expect(shortSha('f3de8ddc621bc23fa3aac5b460f0b0d2a62cb388')).toBe('f3de8dd');
  });

  it('shortens a wallet, leaves a short text alone, and sizes files', () => {
    expect(shortWallet(ORACLE)).toBe('0xfd36…0e22');
    expect(shortWallet('0x1234')).toBe('0x1234');
    expect(formatBytes(840)).toBe('840 B');
    expect(formatBytes(12_700)).toBe('12.4 KB');
    expect(formatBytes(3_250_000)).toBe('3.1 MB');
    expect(formatBytes(1_300_000_000)).toBe('1.2 GB');
    expect(formatBytes(5 * 1024 ** 4)).toBe('5120.0 GB');
  });
});

describe('what the door answers, checked before it is believed', () => {
  const NONCE = 'a'.repeat(32);

  it('reads a request taken, with the admin code or the copy number', () => {
    expect(readAccepted(202, { request: NONCE, adminCode: 'code1234' })).toEqual({
      ok: true,
      request: NONCE,
      adminCode: 'code1234',
      copy: null,
      upload: null,
    });
    expect(readAccepted(202, { request: NONCE, copy: 'b'.repeat(32), adminCode: '' })).toEqual({
      ok: true,
      request: NONCE,
      adminCode: null,
      copy: 'b'.repeat(32),
      upload: null,
    });
    expect(readAccepted(202, { request: NONCE, copy: '../x' })).toMatchObject({ copy: null });
    // A world's code as the machine makes it (16 hex) is shown; anything off its rule is not.
    expect(readAccepted(202, { request: NONCE, adminCode: '9f2c4e6a8b0d1f37' })).toMatchObject({
      adminCode: '9f2c4e6a8b0d1f37',
    });
    for (const odd of ['short', 'with space 1234', 'x'.repeat(65), 'line\nbreak1234', 7]) {
      expect(readAccepted(202, { request: NONCE, adminCode: odd })).toMatchObject({
        adminCode: null,
      });
    }
  });

  it('names a refusal it knows, and calls anything else unexpected', () => {
    expect(readAccepted(403, { error: 'not-an-oracle-here' })).toEqual({
      ok: false,
      error: 'not-an-oracle-here',
      status: 403,
    });
    // Another change of the same world's code is still waiting on the machine.
    expect(readAccepted(409, { error: 'busy' })).toEqual({ ok: false, error: 'busy', status: 409 });
    expect(readAccepted(500, { error: 'boom' })).toMatchObject({ error: 'unexpected' });
    expect(readAccepted(202, { request: 'short' })).toMatchObject({ ok: false, status: 202 });
    expect(readAccepted(502, null)).toMatchObject({ error: 'unexpected', status: 502 });
  });

  it('reads a world from its zip taken: where its zip goes, and the new world’s own code', () => {
    expect(
      readAccepted(202, { request: NONCE, upload: `uploads/${NONCE}`, adminCode: 'code1234' }),
    ).toEqual({
      ok: true,
      request: NONCE,
      adminCode: 'code1234',
      copy: null,
      upload: `uploads/${NONCE}`,
    });
    // Only `uploads/<32 hex>`: never a path the door did not mean.
    for (const odd of [`uploads/${NONCE}/../x`, '/etc/passwd', `upload/${NONCE}`, 7]) {
      expect(readAccepted(202, { request: NONCE, upload: odd })).toMatchObject({ upload: null });
    }
    // Each rule a world's zip can break is a refusal the room knows by name.
    for (const rule of IMPORT_RULES) {
      expect(readAccepted(400, { error: rule })).toEqual({ ok: false, error: rule, status: 400 });
    }
  });

  it('names the rule a machine logs for a zip, with what it adds, and nothing else', () => {
    expect(readImportRule('zip-slip')).toEqual({ rule: 'zip-slip', detail: null });
    expect(readImportRule(' unexpected: world/notes.txt ')).toEqual({
      rule: 'unexpected',
      detail: 'world/notes.txt',
    });
    expect(readImportRule('manifest:   ')).toEqual({ rule: 'manifest', detail: null });
    expect(readImportRule(`ratio: ${'x'.repeat(300)}`)?.detail).toHaveLength(200);
    expect(readImportRule('expired')).toBeNull();
    expect(readImportRule('Zip-Slip')).toBeNull();
    expect(readImportRule(null)).toBeNull();
  });

  it('reads how a request went', () => {
    expect(readRequestResult({ state: 'done', rule: null })).toEqual({
      state: 'done',
      rule: null,
      entry: null,
      version: null,
      made: null,
    });
    expect(readRequestResult({ state: 'failed', rule: 'expired' })).toEqual({
      state: 'failed',
      rule: 'expired',
      entry: null,
      version: null,
      made: null,
    });
    expect(readRequestResult({ state: 'lost' })).toBeNull();
    expect(readRequestResult({ state: 3 })).toBeNull();
    expect(readRequestResult('done')).toBeNull();
    // A world's zip still on its way to its slot is not settled.
    expect(readRequestResult({ state: 'uploading', bytes: 1, of: 2 })).toEqual({
      state: 'uploading',
      rule: null,
      entry: null,
      version: null,
      made: null,
    });
    // The zip entry that broke a rule travels beside it, printable and short, or not at all.
    expect(
      readRequestResult({ state: 'failed', rule: 'unexpected', entry: 'world/notes.txt' }),
    ).toEqual({
      state: 'failed',
      rule: 'unexpected',
      entry: 'world/notes.txt',
      version: null,
      made: null,
    });
    for (const entry of ['', 'a\nb', 'x'.repeat(201), 7, null]) {
      expect(readRequestResult({ state: 'failed', rule: 'unexpected', entry })?.entry).toBeNull();
    }
    const bare = { rule: null, entry: null, version: null, made: null };
    expect(settled({ ...bare, state: 'uploading' })).toBe(false);
    expect(settled({ ...bare, state: 'done' })).toBe(true);
    expect(settled({ ...bare, state: 'failed', rule: 'x' })).toBe(true);
    expect(settled({ ...bare, state: 'working' })).toBe(false);
  });

  it('reads a copy, keeping only what has its shape', () => {
    const sha = 'f'.repeat(64);
    expect(
      readCopyStatus({
        state: 'ready',
        bytes: 2048,
        sha256: sha,
        filename: 'plaza-20261012-0941.zip',
        expiresAt: '2026-10-13T09:41:00Z',
      }),
    ).toEqual({
      state: 'ready',
      bytes: 2048,
      sha256: sha,
      filename: 'plaza-20261012-0941.zip',
      expiresAt: '2026-10-13T09:41:00Z',
    });
    expect(
      readCopyStatus({ state: 'preparing', bytes: -1, sha256: 'nope', filename: '', expiresAt: 4 }),
    ).toEqual({ state: 'preparing', bytes: null, sha256: null, filename: null, expiresAt: null });
    expect(readCopyStatus({ state: 'ready', bytes: 1.5 })).toMatchObject({ bytes: null });
    expect(readCopyStatus({ state: 'gone' })).toBeNull();
    expect(readCopyStatus(null)).toBeNull();
    expect(
      copyDone({ state: 'preparing', bytes: null, sha256: null, filename: null, expiresAt: null }),
    ).toBe(false);
    expect(
      copyDone({ state: 'failed', bytes: null, sha256: null, filename: null, expiresAt: null }),
    ).toBe(true);
  });
});

const order = (id: string, extra: Partial<WorldOrder> = {}): WorldOrder => ({
  id,
  card: id,
  state: 'running',
  server: 'open-1',
  domain: `${id}.numinia.com`,
  image: IMAGE,
  limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
  ...extra,
});

/** A world as the door lists it: the order's fields without card or server, plus its phase. */
const listed = (id: string, phase: string, extra: Record<string, unknown> = {}) => {
  const { card: _card, server: _server, ...fields } = order(id);
  return { ...fields, phase, ...extra };
};

describe('a machine’s worlds and its log', () => {
  it('reads each world of the machine, its phase and its order', () => {
    const worlds = readDoorWorlds(
      {
        worlds: [
          listed('plaza', 'running'),
          listed('foro', 'stopping'),
          listed('token-hall', 'creating'),
          { id: 'vieja', domain: 'vieja.numinia.com', phase: 'deleting' },
          { id: 'rota', domain: 'not a host', phase: 'deleting' },
          listed('mal', 'running', { image: 'x:latest' }),
          listed('raro', 'flying'),
          { ...listed('Upper', 'running') },
          'junk',
        ],
      },
      'open-1',
    );
    expect(worlds).toEqual([
      {
        id: 'plaza',
        phase: 'running',
        order: order('plaza'),
        domain: 'plaza.numinia.com',
        upload: null,
      },
      {
        id: 'foro',
        phase: 'stopping',
        order: order('foro'),
        domain: 'foro.numinia.com',
        upload: null,
      },
      // A name that looks like a key word is still a world: each field was checked one by one.
      {
        id: 'token-hall',
        phase: 'creating',
        order: order('token-hall'),
        domain: 'token-hall.numinia.com',
        upload: null,
      },
      { id: 'vieja', phase: 'deleting', order: null, domain: 'vieja.numinia.com', upload: null },
      { id: 'rota', phase: 'deleting', order: null, domain: null, upload: null },
    ]);
    expect(readDoorWorlds({ worlds: 'none' }, 'open-1')).toBeNull();
    expect(readDoorWorlds(null, 'open-1')).toBeNull();
  });

  it('reads a world on its way back from its zip: its address, and how much of the zip has arrived', () => {
    const worlds = readDoorWorlds(
      {
        worlds: [
          { id: 'copia', domain: 'copia.numinia.com', phase: 'uploading', bytes: 412, of: 1200 },
          { id: 'sin-cuenta', domain: 'sin-cuenta.numinia.com', phase: 'uploading' },
          { id: 'de-mas', domain: 'de-mas.numinia.com', phase: 'uploading', bytes: 9, of: 3 },
          { id: 'vacia', domain: 'vacia.numinia.com', phase: 'uploading', bytes: 0, of: 0 },
          { id: 'medio', domain: 'medio.numinia.com', phase: 'uploading', bytes: 1.5, of: 3 },
          { id: 'abriendo', domain: 'abriendo.numinia.com', phase: 'importing', bytes: 3, of: 3 },
          // Without its address a world from its zip says nothing the room can show.
          { id: 'sin-sitio', phase: 'importing' },
          { id: 'mal-sitio', domain: 'not a host', phase: 'uploading', bytes: 1, of: 2 },
        ],
      },
      'open-1',
    );
    expect(worlds).toEqual([
      {
        id: 'copia',
        phase: 'uploading',
        order: null,
        domain: 'copia.numinia.com',
        upload: { bytes: 412, of: 1200 },
      },
      {
        id: 'sin-cuenta',
        phase: 'uploading',
        order: null,
        domain: 'sin-cuenta.numinia.com',
        upload: null,
      },
      { id: 'de-mas', phase: 'uploading', order: null, domain: 'de-mas.numinia.com', upload: null },
      { id: 'vacia', phase: 'uploading', order: null, domain: 'vacia.numinia.com', upload: null },
      { id: 'medio', phase: 'uploading', order: null, domain: 'medio.numinia.com', upload: null },
      {
        id: 'abriendo',
        phase: 'importing',
        order: null,
        domain: 'abriendo.numinia.com',
        upload: null,
      },
    ]);
  });

  it('reads what the machine did, and drops lines it does not recognise', () => {
    const log = readDoorLog(
      {
        entries: [
          {
            at: '2026-10-12T09:00:00Z',
            type: 'CreateWorld',
            world: 'plaza',
            by: '0x42e6…ca26',
            state: 'done',
          },
          {
            at: '2026-10-12T08:00:00Z',
            type: 'ShowAdminCode',
            world: null,
            by: null,
            state: 'failed',
            rule: 'not an Oracle of this machine',
            took: 2,
          },
          {
            at: '2026-10-12T07:30:00Z',
            type: 'StopWorld',
            world: 'plaza',
            by: null,
            state: 'done',
            rule: 'ignored when done',
            took: -1,
          },
          {
            at: '2026-10-12T07:20:00Z',
            type: 'RotateWorldCode',
            world: 'plaza',
            by: '0x3687…1357',
            state: 'done',
            took: 13,
          },
          { at: '2026-10-12T07:00:00Z', type: 'RebootMachine', state: 'done' },
          { at: 7, type: 'StopWorld', state: 'done' },
          { at: '2026-10-12T06:00:00Z', type: 'StopWorld', world: '../x', state: 'working' },
          'junk',
        ],
      },
      'open-1',
    );
    expect(log).toEqual([
      {
        machine: 'open-1',
        at: '2026-10-12T09:00:00Z',
        type: 'CreateWorld',
        world: 'plaza',
        by: '0x42e6…ca26',
        state: 'done',
        rule: null,
        took: null,
      },
      {
        machine: 'open-1',
        at: '2026-10-12T08:00:00Z',
        type: 'ShowAdminCode',
        world: null,
        by: null,
        state: 'failed',
        rule: 'not an Oracle of this machine',
        took: 2,
      },
      {
        machine: 'open-1',
        at: '2026-10-12T07:30:00Z',
        type: 'StopWorld',
        world: 'plaza',
        by: null,
        state: 'done',
        rule: null,
        took: null,
      },
      {
        machine: 'open-1',
        at: '2026-10-12T07:20:00Z',
        type: 'RotateWorldCode',
        world: 'plaza',
        by: '0x3687…1357',
        state: 'done',
        rule: null,
        took: 13,
      },
    ]);
    expect(readDoorLog({ entries: {} }, 'open-1')).toEqual([]);
    expect(readDoorLog(null, 'open-1')).toEqual([]);
  });

  it('merges several machines’ logs, newest first, up to a limit', () => {
    const line = (machine: string, at: string): DoorLogEntry => ({
      machine,
      at,
      type: 'StopWorld',
      world: 'w',
      by: null,
      state: 'done',
      rule: null,
      took: null,
    });
    const merged = mergeLogs(
      [
        [line('open-1', '2026-10-12T09:00:00Z'), line('open-1', '2026-10-10T09:00:00Z')],
        [line('open-2', '2026-10-11T09:00:00Z')],
      ],
      2,
    );
    expect(merged.map((entry) => `${entry.machine} ${entry.at.slice(0, 10)}`)).toEqual([
      'open-1 2026-10-12',
      'open-2 2026-10-11',
    ]);
  });
});

type Route = (url: string, init: RequestInit | undefined) => Response | Error;

function fakeFetch(route: Route): { fetch: typeof fetch; urls: string[]; bodies: unknown[] } {
  const urls: string[] = [];
  const bodies: unknown[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    urls.push(String(input));
    if (typeof init?.body === 'string') bodies.push(JSON.parse(init.body));
    const answer = route(String(input), init);
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { fetch: impl as typeof fetch, urls, bodies };
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });
const named = (name: string): Error => Object.assign(new Error(name), { name });

/** A heartbeat as readHeartbeat returns it: the door's clock, its last run, what waits. */
const HEARTBEAT: Heartbeat = {
  at: '2026-10-12T09:45:00Z',
  lastRun: { at: '2026-10-12T09:44:30Z', ok: true, rule: null },
  waiting: { requests: 0, since: null },
};

describe('reading a machine', () => {
  const WORLDS = 'https://open-1.numinia.com/fleet/v1/worlds';
  const LOG = 'https://open-1.numinia.com/fleet/v1/log';
  const MACHINE = 'https://open-1.numinia.com/fleet/v1/machine';
  const BEAT = {
    machine: 'open-1',
    lastRun: { at: '2026-10-12T09:44:30Z', ok: true, rule: null },
    waiting: { requests: 0, since: null },
    at: '2026-10-12T09:45:00Z',
    listens: ['events', 'something-later'],
    recipe: 'f3de8ddc621bc23fa3aac5b460f0b0d2a62cb388',
  };

  it('reads its worlds, its log, its heartbeat and its recipe through its door', async () => {
    const door = fakeFetch((url) => {
      if (url === WORLDS) return json({ machine: 'open-1', worlds: [listed('plaza', 'running')] });
      if (url === MACHINE) return json(BEAT);
      return json({
        entries: [{ at: 'now', type: 'StopWorld', world: 'plaza', by: null, state: 'done' }],
      });
    });
    const view = await readMachine(door.fetch, 'open-1');
    expect(view).toMatchObject({ alias: 'open-1', open: true });
    expect(view.open && view.worlds.map((world) => world.id)).toEqual(['plaza']);
    expect(view.open && view.log).toHaveLength(1);
    expect(view.open && view.heartbeat).toEqual({
      at: BEAT.at,
      lastRun: BEAT.lastRun,
      waiting: BEAT.waiting,
    });
    expect(view.open && view.listens).toEqual(['events']);
    expect(view.open && view.recipe).toBe(BEAT.recipe);
    expect(door.urls.sort()).toEqual([LOG, MACHINE, WORLDS]);
  });

  it('keeps its worlds when only the log and the heartbeat cannot be read', async () => {
    const door = fakeFetch((url) =>
      url === WORLDS ? json({ worlds: [] }) : new Response('nope', { status: 500 }),
    );
    expect(await readMachine(door.fetch, 'open-1')).toEqual({
      alias: 'open-1',
      open: true,
      worlds: [],
      log: [],
      heartbeat: null,
      listens: [],
      recipe: null,
      imports: null,
      engines: null,
      updates: false,
      versions: null,
    });
  });

  it('says whether its machine brings worlds back from their zip, and how big a zip it takes', async () => {
    const door = fakeFetch((url) => {
      if (url === WORLDS) return json({ worlds: [] });
      if (url === MACHINE) return json({ ...BEAT, imports: { zipMaxBytes: 2147483648 } });
      return json({ entries: [] });
    });
    const view = await readMachine(door.fetch, 'open-1');
    expect(view.open && view.imports).toEqual({ zipMaxBytes: 2147483648 });
  });

  it('says which engines its machine runs and whether it takes updates', async () => {
    const door = fakeFetch((url) => {
      if (url === WORLDS) {
        return json({ worlds: [listed('plaza', 'updating')] });
      }
      if (url === MACHINE) {
        return json({
          ...BEAT,
          engines: ['numinia-engine', 'later', 'numinia-hyperfy2'],
          updates: true,
        });
      }
      return json({ entries: [] });
    });
    const view = await readMachine(door.fetch, 'open-1');
    expect(view.open && view.engines).toEqual(['numinia-hyperfy2', 'numinia-engine']);
    expect(view.open && view.updates).toBe(true);
    // A world moved to another build says so until its machine has started it.
    expect(view.open && view.worlds.map((world) => world.phase)).toEqual(['updating']);
  });

  it('says what its recipe updater is doing, and nothing when its door does not say', async () => {
    const door = fakeFetch((url) => {
      if (url === WORLDS) return json({ worlds: [] });
      if (url === MACHINE) {
        return json({ ...BEAT, recipeUpdate: { installed: BEAT.recipe, upToDate: true } });
      }
      return json({ entries: [] });
    });
    const view = await readMachine(door.fetch, 'open-1');
    expect(view.open && view.recipeUpdate).toMatchObject({
      installed: BEAT.recipe,
      upToDate: true,
      canary: false,
    });
    const older = await readMachine(
      fakeFetch((url) => json(url === WORLDS ? { worlds: [] } : url === MACHINE ? BEAT : {})).fetch,
      'open-1',
    );
    expect(older.open && 'recipeUpdate' in older).toBe(false);
  });

  it('says why a door could not be read', async () => {
    const cases: [Route, unknown][] = [
      [() => new Response('{}', { status: 502 }), { reason: 'http', status: 502 }],
      [() => named('TimeoutError'), { reason: 'timeout' }],
      [() => named('AbortError'), { reason: 'timeout' }],
      [() => new TypeError('fetch failed'), { reason: 'network' }],
      [() => new Response('<html>', { status: 200 }), { reason: 'shape' }],
      [() => json({ worlds: 'none' }), { reason: 'shape' }],
    ];
    for (const [route, expected] of cases) {
      const view = await readMachine(fakeFetch(route).fetch, 'open-1', 50);
      expect(view).toMatchObject({ alias: 'open-1', open: false, ...(expected as object) });
    }
    const thrown = fakeFetch(() => {
      throw 'not an error';
    });
    expect(await readMachine(thrown.fetch, 'open-1')).toMatchObject({ reason: 'network' });
  });
});

describe('gatherFleet — several doors, one fleet', () => {
  it('lists every machine, every world with its phase, the worlds leaving and one history', () => {
    const views: MachineView[] = [
      {
        alias: 'open-1',
        open: true,
        worlds: [
          {
            id: 'plaza',
            phase: 'stopping',
            order: order('plaza'),
            domain: 'plaza.numinia.com',
            upload: null,
          },
          { id: 'vieja', phase: 'deleting', order: null, domain: null, upload: null },
          {
            id: 'copia',
            phase: 'uploading',
            order: null,
            domain: 'copia.numinia.com',
            upload: { bytes: 10, of: 100 },
          },
        ],
        log: [
          {
            machine: 'open-1',
            at: '2026-10-12T09:00:00Z',
            type: 'StopWorld',
            world: 'plaza',
            by: null,
            state: 'done',
            rule: null,
            took: 12,
          },
        ],
        heartbeat: HEARTBEAT,
        listens: ['events'],
        recipe: RECIPE,
        imports: { zipMaxBytes: 2147483648 },
        engines: ['numinia-hyperfy2', 'numinia-engine'],
        updates: true,
        versions: { max: 2 },
      },
      {
        alias: 'open-2',
        open: true,
        worlds: [
          {
            id: 'plaza',
            phase: 'running',
            order: order('plaza', { server: 'open-2' }),
            domain: 'plaza.numinia.com',
            upload: null,
          },
          {
            id: 'foro',
            phase: 'running',
            order: order('foro', { server: 'open-2' }),
            domain: 'foro.numinia.com',
            upload: null,
          },
          { id: 'otra', phase: 'importing', order: null, domain: 'otra.numinia.com', upload: null },
        ],
        log: [],
        heartbeat: null,
        listens: [],
        recipe: null,
        imports: null,
      },
      { alias: 'open-3', open: false, reason: 'http', status: 502 },
      { alias: 'open-4', open: false, reason: 'timeout' },
    ];
    const fleet = gatherFleet(views);
    expect(fleet.machines).toEqual([
      {
        alias: 'open-1',
        open: true,
        reason: null,
        heartbeat: HEARTBEAT,
        listens: ['events'],
        recipe: RECIPE,
        imports: { zipMaxBytes: 2147483648 },
        engines: ['numinia-hyperfy2', 'numinia-engine'],
        updates: true,
        versions: { max: 2 },
      },
      {
        alias: 'open-2',
        open: true,
        reason: null,
        heartbeat: null,
        listens: [],
        recipe: null,
        imports: null,
        engines: null,
        updates: false,
        versions: null,
      },
      {
        alias: 'open-3',
        open: false,
        reason: 'http 502',
        heartbeat: null,
        listens: [],
        recipe: null,
        imports: null,
        engines: null,
        updates: false,
        versions: null,
      },
      {
        alias: 'open-4',
        open: false,
        reason: 'timeout',
        heartbeat: null,
        listens: [],
        recipe: null,
        imports: null,
        engines: null,
        updates: false,
        versions: null,
      },
    ]);
    // A name belongs to the first machine that holds it.
    expect(fleet.orders.map((o) => `${o.id}@${o.server}`)).toEqual(['plaza@open-1', 'foro@open-2']);
    expect(fleet.phases).toEqual({ plaza: 'stopping', foro: 'running' });
    expect(fleet.leaving).toEqual([{ id: 'vieja', server: 'open-1', domain: null }]);
    // The worlds on their way back from their zip: no order yet, their address, their upload.
    expect(fleet.arriving).toEqual([
      {
        id: 'copia',
        server: 'open-1',
        domain: 'copia.numinia.com',
        phase: 'uploading',
        upload: { bytes: 10, of: 100 },
      },
      {
        id: 'otra',
        server: 'open-2',
        domain: 'otra.numinia.com',
        phase: 'importing',
        upload: null,
      },
    ]);
    expect(fleet.history).toHaveLength(1);
    expect(gatherFleet(views, 0).history).toEqual([]);
  });
});

describe('the calls', () => {
  const NONCE = 'a'.repeat(32);
  const request: FleetRequest = {
    type: 'StopWorld',
    message: { machine: 'open-1', world: 'plaza', nonce: NONCE, expires: EXPIRES },
  };

  it('hands a signed request to its machine’s door, as JSON', async () => {
    const door = fakeFetch((url, init) => {
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
      return json({ request: NONCE }, 202);
    });
    expect(await sendRequest(door.fetch, request, '0xsig')).toEqual({
      ok: true,
      request: NONCE,
      adminCode: null,
      copy: null,
      upload: null,
    });
    expect(door.urls).toEqual(['https://open-1.numinia.com/fleet/v1/actions']);
    expect(door.bodies).toEqual([
      { type: 'StopWorld', message: request.message, signature: '0xsig' },
    ]);
  });

  it('never throws: an unreachable door and an unreadable answer are named', async () => {
    const down = fakeFetch(() => new TypeError('fetch failed'));
    expect(await sendRequest(down.fetch, request, '0xsig')).toEqual({
      ok: false,
      error: 'unreachable',
      status: 0,
    });
    const garbled = fakeFetch(() => new Response('<html>', { status: 502 }));
    expect(await sendRequest(garbled.fetch, request, '0xsig')).toEqual({
      ok: false,
      error: 'unexpected',
      status: 502,
    });
  });

  it('asks how a request and a copy are going; null when the door does not say', async () => {
    const door = fakeFetch((url) =>
      url.endsWith(`/requests/${NONCE}`)
        ? json({ request: NONCE, state: 'working', rule: null })
        : json({ copy: 'c'.repeat(32), state: 'preparing' }),
    );
    expect(await readRequest(door.fetch, 'open-1', NONCE)).toEqual({
      state: 'working',
      rule: null,
      entry: null,
      version: null,
      made: null,
    });
    expect(await readCopy(door.fetch, 'open-1', 'c'.repeat(32))).toMatchObject({
      state: 'preparing',
    });
    expect(door.urls).toEqual([
      `https://open-1.numinia.com/fleet/v1/requests/${NONCE}`,
      `https://open-1.numinia.com/fleet/v1/copies/${'c'.repeat(32)}`,
    ]);
    const missing = fakeFetch(() => json({ error: 'not-found' }, 404));
    expect(await readRequest(missing.fetch, 'open-1', NONCE)).toBeNull();
    expect(await readCopy(missing.fetch, 'open-1', 'c'.repeat(32))).toBeNull();
  });
});

describe('waitFor — asking again until the machine is done', () => {
  it('returns as soon as the answer is final', async () => {
    let asked = 0;
    const answer = await waitFor(
      async () => {
        asked += 1;
        return asked < 3 ? (asked === 1 ? null : 'working') : 'done';
      },
      (value) => value === 'done',
      { intervalMs: 1, timeoutMs: 5000 },
    );
    expect(answer).toBe('done');
    expect(asked).toBe(3);
  });

  it('gives the last answer when the time runs out, or null if there was none', async () => {
    let clock = 0;
    const waiting = {
      intervalMs: 10,
      timeoutMs: 25,
      now: () => clock,
      sleep: async (ms: number) => {
        clock += ms;
      },
    };
    expect(
      await waitFor(
        async () => 'working',
        () => false,
        waiting,
      ),
    ).toBe('working');
    clock = 0;
    expect(
      await waitFor(
        async () => null,
        () => false,
        waiting,
      ),
    ).toBeNull();
  });

  it('stops when the wait is cancelled', async () => {
    let asked = 0;
    const answer = await waitFor(
      async () => {
        asked += 1;
        return 'working';
      },
      () => false,
      { intervalMs: 1, timeoutMs: 5000, cancelled: () => asked >= 2 },
    );
    expect(answer).toBe('working');
    expect(asked).toBe(2);
  });
});

describe('whether a machine obeys — its door’s heartbeat', () => {
  const AT = '2026-10-12T10:00:00Z';
  /** A heartbeat `run` seconds after the last run (null: none), `waited` seconds after the oldest request. */
  const beat = (
    run: number | null,
    { ok = true, requests = 0, waited = 0, rule = null as string | null } = {},
  ): Heartbeat => ({
    at: AT,
    lastRun:
      run === null ? null : { at: new Date(Date.parse(AT) - run * 1000).toISOString(), ok, rule },
    waiting: {
      requests,
      since: requests > 0 ? new Date(Date.parse(AT) - waited * 1000).toISOString() : null,
    },
  });

  it('reads the door’s heartbeat, and nothing from a door that publishes none', () => {
    expect(
      readHeartbeat({
        machine: 'open-1',
        lastRun: { at: '2026-10-12T09:59:30Z', ok: false, rule: 'x'.repeat(300) },
        waiting: { requests: 2, since: '2026-10-12T09:58:00Z' },
        at: AT,
      }),
    ).toEqual({
      at: AT,
      lastRun: { at: '2026-10-12T09:59:30Z', ok: false, rule: 'x'.repeat(200) },
      waiting: { requests: 2, since: '2026-10-12T09:58:00Z' },
    });
    // A run without a rule, an odd run and an odd `since` are read as nothing.
    expect(
      readHeartbeat({
        lastRun: { at: '2026-10-12T09:59:30.123Z', ok: true, rule: '' },
        waiting: { requests: 0, since: 'yesterday' },
        at: AT,
      }),
    ).toEqual({
      at: AT,
      lastRun: { at: '2026-10-12T09:59:30.123Z', ok: true, rule: null },
      waiting: { requests: 0, since: null },
    });
    expect(
      readHeartbeat({ lastRun: { at: 'now', ok: true }, waiting: { requests: 0 }, at: AT })
        ?.lastRun,
    ).toBeNull();
    expect(
      readHeartbeat({ lastRun: { at: AT, ok: 'yes' }, waiting: { requests: 0 }, at: AT })?.lastRun,
    ).toBeNull();
    // A door older than the heartbeat (no `at`, no `waiting`) says nothing at all.
    expect(readHeartbeat({ machine: 'open-1', door: 'fleetd/1', oracles: 1 })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: null })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: { requests: -1 } })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: { requests: 1.5 } })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: { requests: '1' } })).toBeNull();
    expect(readHeartbeat(null)).toBeNull();
  });

  it('says a machine obeys while it runs every minute and takes what waits', () => {
    expect(machineHealth(null)).toEqual({ kind: 'unknown' });
    expect(machineHealth(beat(30))).toEqual({ kind: 'ok', ago: 30 });
    expect(machineHealth(beat(30, { requests: 1, waited: 20 }))).toEqual({ kind: 'ok', ago: 30 });
    // A run stamped a moment after the door's own clock is not a negative age.
    expect(machineHealth(beat(-2))).toEqual({ kind: 'ok', ago: 0 });
  });

  it('says it is late after three minutes, and not obeying after ten', () => {
    expect(machineHealth(beat(SLOW_AFTER_S + 60))).toEqual({
      kind: 'slow',
      ago: SLOW_AFTER_S + 60,
      waiting: 0,
    });
    // It ran a moment ago, but a request has waited four minutes.
    expect(machineHealth(beat(20, { requests: 2, waited: 240 }))).toEqual({
      kind: 'slow',
      ago: 20,
      waiting: 2,
    });
    expect(machineHealth(beat(SILENT_AFTER_S + 900, { requests: 1, waited: 60 }))).toEqual({
      kind: 'silent',
      ago: SILENT_AFTER_S + 900,
      waiting: 1,
    });
    // Silence wins over a failed last run: what matters is that it stopped.
    expect(machineHealth(beat(SILENT_AFTER_S + 1, { ok: false }))).toMatchObject({
      kind: 'silent',
    });
  });

  it('says it is failing when its last run could not apply the book', () => {
    expect(machineHealth(beat(40, { ok: false, rule: 'docker did not take the book' }))).toEqual({
      kind: 'failing',
      ago: 40,
      rule: 'docker did not take the book',
    });
  });

  it('judges a machine with no run on record by what waits for it alone', () => {
    expect(machineHealth(beat(null))).toEqual({ kind: 'unknown' });
    expect(machineHealth(beat(null, { requests: 1, waited: 60 }))).toEqual({ kind: 'unknown' });
    expect(machineHealth(beat(null, { requests: 1, waited: 300 }))).toEqual({
      kind: 'slow',
      ago: null,
      waiting: 1,
    });
    expect(machineHealth(beat(null, { requests: 3, waited: 3600 }))).toEqual({
      kind: 'silent',
      ago: null,
      waiting: 3,
    });
  });

  it('writes a span of seconds short', () => {
    expect(formatAgo(45.4)).toBe('45 s');
    expect(formatAgo(-3)).toBe('0 s');
    expect(formatAgo(180)).toBe('3 min');
    expect(formatAgo(1500)).toBe('25 min');
    expect(formatAgo(7200)).toBe('2 h');
    expect(formatAgo(4 * 86_400)).toBe('4 d');
  });
});

describe('which recipe a machine was installed from', () => {
  const OLDER = 'f3de8ddc621bc23fa3aac5b460f0b0d2a62cb388';

  it('reads the commit a door says, and nothing that is not one', () => {
    expect(readRecipe({ machine: 'open-1', recipe: OLDER })).toBe(OLDER);
    expect(readRecipe({ recipe: OLDER.toUpperCase() })).toBeNull();
    expect(readRecipe({ recipe: OLDER.slice(0, 7) })).toBeNull();
    expect(readRecipe({ recipe: `${OLDER}\n` })).toBeNull();
    expect(readRecipe({ recipe: 'main' })).toBeNull();
    expect(readRecipe({ recipe: null })).toBeNull();
    // A door older than the pinned recipe says nothing at all.
    expect(readRecipe({ machine: 'open-1', door: 'fleetd/1' })).toBeNull();
    expect(readRecipe(null)).toBeNull();
  });

  it('reads what a machine’s recipe updater says, field by field, and nothing it does not know', () => {
    const MAIN = '9e71b3c4d05a2f86e1c7b9a0d3f4e5268c1b7a02';
    const said = {
      installed: OLDER,
      upToDate: false,
      mainCommit: MAIN,
      checkedAt: '2026-10-19T09:52:00Z',
      target: MAIN,
      targetWhy: 'resting',
      restUntil: '2026-10-19T11:40:00Z',
      canary: false,
      pin: null,
      halted: false,
      haltedCommit: null,
      haltedReason: null,
      refused: null,
      lastPass: { at: '2026-10-19T09:52:00Z', action: 'resting' },
    };
    expect(readRecipeUpdate({ recipe: OLDER, recipeUpdate: said })).toEqual({
      installed: OLDER,
      upToDate: false,
      target: MAIN,
      targetWhy: 'resting',
      restUntil: '2026-10-19T11:40:00Z',
      canary: false,
      pin: null,
      halted: false,
      haltedReason: null,
      refused: null,
      lastPass: { at: '2026-10-19T09:52:00Z', action: 'resting' },
    });
    // Stops and switches, as recipe.py writes them.
    expect(
      readRecipeUpdate({
        recipeUpdate: {
          canary: true,
          pin: 'off',
          halted: true,
          haltedReason: 'the door did not answer with the new recipe',
          refused: { commit: MAIN, why: 'signed by a key that is not GitHub’s web-flow key' },
        },
      }),
    ).toMatchObject({
      canary: true,
      pin: 'off',
      halted: true,
      haltedReason: 'the door did not answer with the new recipe',
      refused: { commit: MAIN, why: 'signed by a key that is not GitHub’s web-flow key' },
    });
    expect(readRecipeUpdate({ recipeUpdate: { pin: MAIN, refused: { why: 'x' } } })).toMatchObject({
      pin: MAIN,
      refused: { commit: null, why: 'x' },
    });
    // Anything else falls back to null or false: a field is never guessed.
    expect(
      readRecipeUpdate({
        recipeUpdate: {
          installed: 'main',
          upToDate: 'yes',
          target: OLDER.toUpperCase(),
          targetWhy: 'soon',
          restUntil: 'tomorrow',
          canary: 'true',
          pin: 'later',
          halted: 1,
          haltedReason: 'two\nlines',
          refused: { commit: MAIN },
          lastPass: { at: '2026-10-19T09:52:00Z' },
        },
      }),
    ).toEqual({
      installed: null,
      upToDate: null,
      target: null,
      targetWhy: null,
      restUntil: null,
      canary: false,
      pin: null,
      halted: false,
      haltedReason: null,
      refused: null,
      lastPass: null,
    });
    expect(readRecipeUpdate({ recipeUpdate: { refused: 'no', lastPass: 'now' } })).toMatchObject({
      refused: null,
      lastPass: null,
    });
    // A door older than the recipe that follows main says nothing at all.
    expect(readRecipeUpdate({ recipe: OLDER })).toBeNull();
    expect(readRecipeUpdate({ recipeUpdate: 'on' })).toBeNull();
    expect(readRecipeUpdate(null)).toBeNull();
  });

  it('says what each machine’s recipe is doing, as it says, and compares with no recipe of its own', () => {
    const update = readRecipeUpdate({ recipeUpdate: {} });
    if (update === null) throw new Error('an empty recipeUpdate is still one');
    const state = (said: Partial<typeof update>, recipe: string | null = OLDER) =>
      recipeState({ open: true, recipe, recipeUpdate: { ...update, ...said } });
    // A machine whose door does not answer shows its line instead.
    expect(recipeState({ open: false, recipe: null })).toBeNull();
    // Older than the recipe that follows main, or naming no recipe: one last install.
    expect(recipeState({ open: true, recipe: OLDER })).toEqual({ kind: 'manual' });
    expect(state({ upToDate: true }, null)).toEqual({ kind: 'manual' });
    // What it says, any recipe: none is «older» here.
    expect(state({ upToDate: true })).toEqual({ kind: 'current' });
    expect(state({ upToDate: true, canary: true })).toEqual({ kind: 'current' });
    expect(state({ upToDate: false, targetWhy: 'canary' })).toEqual({ kind: 'updating' });
    expect(state({ upToDate: false, targetWhy: 'rested' })).toEqual({ kind: 'updating' });
    expect(
      state({ upToDate: false, targetWhy: 'resting', restUntil: '2026-10-19T11:40:00Z' }),
    ).toEqual({ kind: 'resting', until: '2026-10-19T11:40:00Z' });
    expect(state({ upToDate: false, targetWhy: 'resting' })).toEqual({
      kind: 'resting',
      until: null,
    });
    expect(state({})).toEqual({ kind: 'checking' });
    // Stops and switches come before «up to date».
    expect(state({ upToDate: true, halted: true, haltedReason: 'health' })).toEqual({
      kind: 'halted',
      reason: 'health',
    });
    expect(state({ halted: true })).toEqual({ kind: 'halted', reason: null });
    expect(state({ upToDate: false, refused: { commit: null, why: 'unsigned' } })).toEqual({
      kind: 'refused',
      reason: 'unsigned',
    });
    expect(state({ upToDate: true, pin: OLDER })).toEqual({ kind: 'held', commit: OLDER });
    expect(state({ upToDate: true, pin: 'off', halted: true })).toEqual({ kind: 'frozen' });
  });

  it('keeps the hermetic fleet in step: open-1 follows main, bronte-xs-ca-003 waits for a rest, open-2 needs its last install', () => {
    const views = (fixtureFleet as unknown as { readonly machines: readonly MachineView[] })
      .machines;
    const machines = gatherFleet(views).machines;
    expect(machines.map((machine) => [machine.alias, machine.recipe])).toEqual([
      ['open-1', RECIPE],
      ['open-2', null],
      ['bronte-xs-ca-003', RECIPE],
      ['open-3', null],
    ]);
    expect(machines.map((machine) => recipeState(machine)?.kind ?? null)).toEqual([
      'current',
      'manual',
      'resting',
      null,
    ]);
    expect(machines.map((machine) => machine.recipeUpdate?.canary ?? null)).toEqual([
      true,
      null,
      false,
      null,
    ]);
    // A door that names its engines and one that does not (Hyperfy alone).
    expect(machines.map((machine) => [machine.engines ?? null, machine.updates])).toEqual([
      [null, false],
      [null, false],
      [['numinia-hyperfy2', 'numinia-engine'], true],
      [null, false],
    ]);
  });
});

describe('what the room tells a machine about the browser’s side', () => {
  it('reads what a door listens to, and nothing it does not know', () => {
    expect(readListens({ listens: ['events', 'later', 7] })).toEqual(['events']);
    expect(readListens({ listens: [] })).toEqual([]);
    expect(readListens({ listens: 'events' })).toEqual([]);
    expect(readListens({ machine: 'open-1' })).toEqual([]);
    expect(readListens(null)).toEqual([]);
  });
  const event = (
    step: BeaconEvent['step'],
    ms: number,
    problem: string | null = null,
  ): BeaconEvent => ({
    step,
    type: 'StopWorld',
    problem,
    ms,
  });

  it('writes steps as names and whole milliseconds, never more than the door takes', () => {
    expect(
      JSON.parse(beaconBody([event('asked', 0), event('wallet-refused', 812.6, 'no-wallet')])),
    ).toEqual({
      events: [
        { step: 'asked', type: 'StopWorld', problem: null, ms: 0 },
        { step: 'wallet-refused', type: 'StopWorld', problem: 'no-wallet', ms: 813 },
      ],
    });
    const many = Array.from({ length: BEACON_MAX_EVENTS + 5 }, (_, n) => event('asked', n));
    expect(JSON.parse(beaconBody(many)).events).toHaveLength(BEACON_MAX_EVENTS);
    const odd = JSON.parse(beaconBody([event('late', -5), event('late', 1e12)])).events;
    expect(odd.map((e: { ms: number }) => e.ms)).toEqual([0, 86_400_000]);
  });

  it('hands them to the machine’s door as one text beacon, and never throws', async () => {
    const sent: { url: string; body: Blob }[] = [];
    const send = (url: string, body: Blob): boolean => {
      sent.push({ url, body });
      return true;
    };
    expect(sendBeacon('open-1', [event('asked', 0), event('accepted', 900)], send)).toBe(true);
    expect(sent[0]?.url).toBe('https://open-1.numinia.com/fleet/v1/events');
    expect(sent[0]?.body.type).toBe('text/plain');
    expect(JSON.parse((await sent[0]?.body.text()) ?? '').events).toHaveLength(2);
    // Nothing to say, no beacon in this browser, or a beacon that throws: nothing breaks.
    expect(sendBeacon('open-1', [], send)).toBe(false);
    expect(sendBeacon('open-1', [event('asked', 0)], null)).toBe(false);
    expect(
      sendBeacon('open-1', [event('asked', 0)], () => {
        throw new Error('blocked');
      }),
    ).toBe(false);
    expect(sent).toHaveLength(1);
  });
});

describe('a world from its zip — sizes, the doors that take zips, the upload, a reload', () => {
  it('knows every rule a world’s zip can break as a refusal of the door', () => {
    for (const rule of IMPORT_RULES) expect(DOOR_ERRORS).toContain(rule);
    expect(IMPORT_RULES).toHaveLength(21);
    // A Numinia Engine zip its own engine would not read: the engine's one line rides with it.
    expect(readImportRule('engine-refused: mundo.json no es numinia-engine/mundo@2')).toEqual({
      rule: 'engine-refused',
      detail: 'mundo.json no es numinia-engine/mundo@2',
    });
  });

  it('reads which engines a door runs and whether it takes updates; nothing from a door that says otherwise', () => {
    expect(readEngines({ engines: ['numinia-engine', 'numinia-hyperfy2'] })).toEqual([
      'numinia-hyperfy2',
      'numinia-engine',
    ]);
    expect(readEngines({ engines: ['something-else'] })).toEqual([]);
    for (const body of [null, {}, { engines: 'numinia-engine' }, []]) {
      expect(readEngines(body)).toBeNull();
    }
    expect(readUpdates({ updates: true })).toBe(true);
    for (const body of [null, {}, { updates: 'yes' }, { updates: 1 }]) {
      expect(readUpdates(body)).toBe(false);
    }
    // An engine the machine does not run, or another engine's build: refusals with words.
    expect(readAccepted(409, { error: 'unknown-engine' })).toEqual({
      ok: false,
      error: 'unknown-engine',
      status: 409,
    });
    expect(readAccepted(409, { error: 'engine-mismatch' })).toMatchObject({
      error: 'engine-mismatch',
    });
  });

  it('writes a size short, in binary units and the reader’s language, at most one decimal', () => {
    expect(formatSize(0, 'en')).toBe('0 B');
    expect(formatSize(-3, 'en')).toBe('0 B');
    expect(formatSize(512, 'en')).toBe('512 B');
    expect(formatSize(50331648, 'es')).toBe('48 MB');
    expect(formatSize(432013312, 'es')).toBe('412 MB');
    expect(formatSize(1288490189, 'es')).toBe('1,2 GB');
    expect(formatSize(1288490189, 'en')).toBe('1.2 GB');
    expect(formatSize(3 * 1024 ** 5, 'en')).toBe('3,072 TB');
    // No language said: the browser's own.
    expect(formatSize(1536, '')).toMatch(/^1[.,]5 KB$/);
    expect(formatSize(1536)).toMatch(/^1[.,]5 KB$/);
    expect(formatCount(50331648, 'es')).toBe('50.331.648');
    expect(formatCount(50331648, 'en')).toBe('50,331,648');
    expect(formatCount(7)).toBe('7');
  });

  it('reads whether a door takes zips, and the biggest it takes; nothing from a door that says otherwise', () => {
    expect(readImports({ imports: { zipMaxBytes: 2147483648 } })).toEqual({
      zipMaxBytes: 2147483648,
    });
    for (const odd of [0, -1, 1.5, '2147483648', 2 ** 60, null]) {
      expect(readImports({ imports: { zipMaxBytes: odd } })).toBeNull();
    }
    expect(readImports({ imports: 'yes' })).toBeNull();
    expect(readImports({ imports: [] })).toBeNull();
    expect(readImports({ recipe: RECIPE })).toBeNull();
    expect(readImports(null)).toBeNull();
  });

  /** A browser's XMLHttpRequest, as much of it as the upload uses, played by a script. */
  class FakeXhr {
    method = '';
    url = '';
    body: unknown = null;
    status = 0;
    responseText = '';
    aborted = false;
    readonly upload: { onprogress: ((event: { loaded: number }) => void) | null } = {
      onprogress: null,
    };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    constructor(private readonly script: (xhr: FakeXhr) => void) {}
    open(method: string, url: string): void {
      this.method = method;
      this.url = url;
    }
    send(body: unknown): void {
      this.body = body;
      this.script(this);
    }
    abort(): void {
      this.aborted = true;
      this.onabort?.();
    }
    progress(loaded: number): void {
      this.upload.onprogress?.({ loaded });
    }
    answer(status: number, text = ''): void {
      this.status = status;
      this.responseText = text;
      this.onload?.();
    }
  }

  const NONCE = 'c'.repeat(32);
  const ZIP = new Blob([new Uint8Array(20)]);

  function door(script: (xhr: FakeXhr) => void) {
    const made: FakeXhr[] = [];
    const sent: number[] = [];
    return {
      made,
      sent,
      onProgress: (bytes: number) => sent.push(bytes),
      factory: () => {
        const xhr = new FakeXhr(script);
        made.push(xhr);
        return xhr as unknown as XMLHttpRequest;
      },
    };
  }

  it('sends the zip whole, in one PUT to its slot, saying how much has left', async () => {
    const fake = door((xhr) => {
      xhr.progress(8);
      xhr.progress(16);
      xhr.answer(202, JSON.stringify({ request: NONCE }));
    });
    expect(await uploadZip('open-1', NONCE, ZIP, fake.onProgress, fake.factory)).toEqual({
      ok: true,
    });
    expect(fake.made).toHaveLength(1);
    expect(fake.made[0]?.method).toBe('PUT');
    expect(fake.made[0]?.url).toBe(`https://open-1.numinia.com/fleet/v1/uploads/${NONCE}`);
    expect(fake.made[0]?.body).toBe(ZIP);
    expect(fake.sent).toEqual([8, 16, 20]);
  });

  it('names what the door refused: a wrong zip, a slot gone, an answer it cannot read', async () => {
    const cases: [number, string, string][] = [
      [400, JSON.stringify({ error: 'fingerprint' }), 'fingerprint'],
      [400, JSON.stringify({ error: 'wrong-size' }), 'wrong-size'],
      // No length at all (411): for the Oracle, a zip that arrived incomplete.
      [411, JSON.stringify({ error: 'length' }), 'wrong-size'],
      [410, JSON.stringify({ error: 'slot-expired' }), 'slot-expired'],
      [404, JSON.stringify({ error: 'missing' }), 'missing'],
      [409, JSON.stringify({ error: 'busy' }), 'busy'],
      [502, '<html>bad gateway</html>', 'unexpected'],
    ];
    for (const [status, text, error] of cases) {
      const fake = door((xhr) => {
        xhr.progress(20);
        xhr.answer(status, text);
      });
      expect(await uploadZip('open-1', NONCE, ZIP, fake.onProgress, fake.factory)).toEqual({
        ok: false,
        error,
        status,
        sent: 20,
      });
    }
  });

  it('tells a door never reached from a connection cut part-way', async () => {
    const never = door((xhr) => xhr.onerror?.());
    expect(await uploadZip('open-1', NONCE, ZIP, never.onProgress, never.factory)).toEqual({
      ok: false,
      error: 'unreachable',
      status: 0,
      sent: 0,
    });
    const cut = door((xhr) => {
      xhr.progress(7);
      xhr.onerror?.();
    });
    expect(await uploadZip('open-1', NONCE, ZIP, cut.onProgress, cut.factory)).toEqual({
      ok: false,
      error: 'cut',
      status: 0,
      sent: 7,
    });
  });

  it('stops when the Oracle stops it, and never starts when already stopped', async () => {
    const controller = new AbortController();
    const fake = door((xhr) => {
      xhr.progress(3);
      controller.abort();
    });
    expect(
      await uploadZip('open-1', NONCE, ZIP, fake.onProgress, fake.factory, controller.signal),
    ).toEqual({ ok: false, error: 'stopped', status: 0, sent: 3 });
    expect(fake.made[0]?.aborted).toBe(true);
    const late = door(() => undefined);
    expect(
      await uploadZip('open-1', NONCE, ZIP, late.onProgress, late.factory, controller.signal),
    ).toEqual({ ok: false, error: 'stopped', status: 0, sent: 0 });
    expect(late.made).toHaveLength(0);
    // A signal that never fires is let go once the upload ends.
    const calm = new AbortController();
    const done = door((xhr) => xhr.answer(202, '{}'));
    expect(
      await uploadZip('open-1', NONCE, ZIP, done.onProgress, done.factory, calm.signal),
    ).toEqual({ ok: true });
  });

  it('never throws: a browser that cannot make the request is a door never reached', async () => {
    const broken = (): XMLHttpRequest => {
      throw new Error('no XMLHttpRequest here');
    };
    expect(await uploadZip('open-1', NONCE, ZIP, () => undefined, broken)).toEqual({
      ok: false,
      error: 'unreachable',
      status: 0,
      sent: 0,
    });
    // The browser's own request, where there is none (this test's runtime): the same.
    expect(await uploadZip('open-1', NONCE, ZIP, () => undefined)).toMatchObject({
      error: 'unreachable',
    });
  });

  const TICKET: ImportTicket = {
    machine: 'open-1',
    world: 'plaza-copia',
    domain: 'plaza-copia.numinia.com',
    nonce: NONCE,
    bytes: 50331648,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    name: 'plaza-20261012-0930.zip',
  };

  it('keeps an unfinished upload in the tab’s history entry, and reads back only what has its shape', () => {
    const state = withTickets({ worldsDialog: true }, [TICKET]);
    expect(state).toMatchObject({ worldsDialog: true });
    expect(readTickets(state)).toEqual([TICKET]);
    expect(withTickets({ worldsImports: [TICKET], keep: 1 }, [])).toEqual({ keep: 1 });
    expect(withTickets(null, [])).toEqual({});
    expect(readTickets(null)).toEqual([]);
    expect(readTickets({ worldsImports: 'x' })).toEqual([]);
    const odd: unknown[] = [
      'junk',
      { ...TICKET, machine: 'Open 1' },
      { ...TICKET, world: '../x' },
      { ...TICKET, domain: 'not a host' },
      { ...TICKET, nonce: 'short' },
      { ...TICKET, bytes: 0 },
      { ...TICKET, bytes: 1.5 },
      { ...TICKET, sha256: 'f'.repeat(63) },
      { ...TICKET, name: 'x'.repeat(256) },
      { ...TICKET, name: 7 },
    ];
    expect(readTickets({ worldsImports: [...odd, TICKET] })).toEqual([TICKET]);
  });
});

describe('a world’s versions — the five requests and the vectors they share', () => {
  /** A vector's message, with the fields of every version type (the ones its type lacks are absent). */
  type VersionMessage = {
    readonly machine: string;
    readonly world: string;
    readonly version: string;
    readonly zipBytes: number;
    readonly zipSha256: string;
    readonly replace: string;
    readonly nonce: string;
    readonly expires: number;
  };
  const at = (type: string, nth = 0): { readonly message: VersionMessage } => {
    const found = VECTORS.filter((vector) => vector.type === type)[nth];
    if (found === undefined) throw new Error(`no ${type} vector`);
    return found as unknown as { readonly message: VersionMessage };
  };

  it('writes each version request with the machine’s fields, in the type’s order', () => {
    for (const kind of [
      'DuplicateVersion',
      'PublishVersion',
      'DeleteVersion',
      'DownloadVersion',
    ] as const) {
      const vector = at(kind);
      const request = buildRequest(
        { kind, machine: 'open-1', world: 'plaza', version: vector.message.version },
        vector.message.nonce,
        NOW_MS,
      );
      expect(request).toEqual({ type: kind, message: vector.message });
      expect(Object.keys(request.message)).toEqual([
        'machine',
        'world',
        'version',
        'nonce',
        'expires',
      ]);
      expect(REQUEST_TYPES[kind].map((field) => field.name)).toEqual(Object.keys(request.message));
    }
  });

  it('writes a zip as a version: the world, the zip, and the version it replaces — no image, memory or address', () => {
    for (const [nth, replace] of [
      [0, ''],
      [1, 'v2'],
    ] as const) {
      const vector = at('ImportVersion', nth);
      expect(vector.message.replace).toBe(replace);
      const request = buildRequest(
        {
          kind: 'ImportVersion',
          machine: 'open-1',
          world: 'plaza',
          zipBytes: vector.message.zipBytes,
          zipSha256: vector.message.zipSha256,
          replace,
        },
        vector.message.nonce,
        NOW_MS,
      );
      expect(request).toEqual({ type: 'ImportVersion', message: vector.message });
      expect(Object.keys(request.message)).toEqual([
        'machine',
        'world',
        'zipBytes',
        'zipSha256',
        'replace',
        'nonce',
        'expires',
      ]);
      const data = typedData(request);
      expect(data.message['zipBytes']).toBe(BigInt(vector.message.zipBytes));
      expect(data.message['replace']).toBe(replace);
      expect(Object.keys(data.types)).toEqual(['ImportVersion']);
    }
  });

  it('hands the wallet a version as text and the expiry as a bigint', () => {
    const data = typedData({ type: 'PublishVersion', message: at('PublishVersion').message });
    expect(data.primaryType).toBe('PublishVersion');
    expect(data.message['version']).toBe('v2');
    expect(data.message['expires']).toBe(BigInt(EXPIRES));
  });

  it('recovers the house’s signed list — all three records — to the house, never to an Oracle', async () => {
    const types = {
      FleetSigners: [
        { name: 'signers', type: 'string' },
        { name: 'seq', type: 'uint256' },
        { name: 'issuedAt', type: 'uint256' },
      ],
    } as const;
    for (const record of Object.values(HOUSE.records)) {
      const message = {
        signers: record.signed.signers,
        seq: BigInt(record.signed.seq),
        issuedAt: BigInt(record.signed.issuedAt),
      };
      // The wire carries the wallets as a list; the wallet signs them joined with a comma.
      expect(record.wire.message.signers.join(',')).toBe(record.signed.signers);
      const data = {
        domain: { ...FLEET_DOMAIN },
        types,
        primaryType: 'FleetSigners',
        message,
      } as const;
      expect(hashTypedData(data)).toBe(record.digest);
      const signer = await recoverTypedDataAddress({ ...data, signature: record.wire.signature });
      expect(signer.toLowerCase()).toBe(HOUSE.signer);
      expect(signer.toLowerCase()).not.toBe(ORACLE);
    }
  });

  it('knows every rule a machine names for a version as a refusal, and keeps the old ones', () => {
    for (const rule of VERSION_RULES) expect(DOOR_ERRORS).toContain(rule);
    expect(VERSION_RULES).toHaveLength(10);
    for (const error of ['busy', 'missing', 'still-deleting', 'zip-too-big', 'no-room']) {
      expect(DOOR_ERRORS).toContain(error);
    }
    expect(readAccepted(409, { error: 'full' })).toEqual({ ok: false, error: 'full', status: 409 });
  });

  it('takes a download of a version with its copy, and a zip as a version with its slot and no code', () => {
    const request = 'a'.repeat(32);
    expect(readAccepted(202, { request, copy: 'b'.repeat(32) })).toEqual({
      ok: true,
      request,
      adminCode: null,
      copy: 'b'.repeat(32),
      upload: null,
    });
    expect(readAccepted(202, { request, upload: `uploads/${request}` })).toEqual({
      ok: true,
      request,
      adminCode: null,
      copy: null,
      upload: `uploads/${request}`,
    });
  });

  it('reads which version a request was about and which one it made', () => {
    const done = { state: 'done', rule: null, at: '2026-10-22T09:00:00Z' };
    expect(
      readRequestResult({ ...done, type: 'DuplicateVersion', version: 'v1', made: 'v2' }),
    ).toEqual({ state: 'done', rule: null, entry: null, version: 'v1', made: 'v2' });
    expect(readRequestResult({ ...done, version: 'v2' })).toMatchObject({
      version: 'v2',
      made: null,
    });
    // A name that is not a version's is nothing.
    for (const odd of ['v0', 'v10000', 'V1', '../v1', 'v01', 2, null, '']) {
      expect(readRequestResult({ ...done, version: odd, made: odd })).toMatchObject({
        version: null,
        made: null,
      });
    }
    expect(readVersionId('v1')).toBe('v1');
    expect(readVersionId('v9999')).toBe('v9999');
    expect(readVersionId(undefined)).toBeNull();
    expect(VERSION_ID.test('v12')).toBe(true);
  });

  it('knows the five version requests, and the refusals they have words for', () => {
    expect(VERSION_KINDS).toHaveLength(5);
    for (const kind of VERSION_KINDS) {
      expect(isVersionKind(kind)).toBe(true);
      expect(Object.keys(REQUEST_TYPES)).toContain(kind);
    }
    expect(isVersionKind('DownloadWorld')).toBe(false);
    for (const rule of VERSION_RULES) expect(isVersionProblem(rule)).toBe(true);
    for (const error of ['busy', 'missing', 'still-deleting', 'no-room', 'engine-refused']) {
      expect(isVersionProblem(error)).toBe(true);
      expect(DOOR_ERRORS).toContain(error);
    }
    expect(VERSION_PROBLEMS).toHaveLength(VERSION_RULES.length + 5);
    expect(isVersionProblem('exists')).toBe(false);
    expect(isVersionProblem('unreachable')).toBe(false);
  });

  it('reads the rule a machine names in a version request’s result', () => {
    expect(readVersionProblem('no-room')).toBe('no-room');
    expect(readVersionProblem(' switch-stuck ')).toBe('switch-stuck');
    expect(readVersionProblem('engine-refused: the copy would not close')).toBe('engine-refused');
    expect(readVersionProblem('zip-slip')).toBeNull();
    expect(readVersionProblem('')).toBeNull();
    expect(readVersionProblem('???')).toBeNull();
    expect(readVersionProblem(null)).toBeNull();
  });

  it('calls a version by its number', () => {
    expect(versionNumber('v1')).toBe(1);
    expect(versionNumber('v42')).toBe(42);
  });

  it('tells how a version request ended, in the room’s words', () => {
    const words: VersionOutcomeWords = {
      done: {
        PublishVersion: 'published {n} of {w}',
        DuplicateVersion: 'copy of {w} is {n}',
        DeleteVersion: 'deleted {n} of {w}',
      },
      failed: '{m} failed ({rule})',
      problems: Object.fromEntries(VERSION_PROBLEMS.map((p) => [p, `${p} on {m} v{n}`])) as Record<
        (typeof VERSION_PROBLEMS)[number],
        string
      >,
    };
    const job = { world: 'plaza', machine: 'open-1' } as const;
    const result = (
      state: 'done' | 'failed' | 'working' | 'pending',
      rule: string | null,
      made: string | null = null,
    ) => ({
      state,
      rule,
      entry: null,
      version: null,
      made,
    });
    const publish = { ...job, kind: 'PublishVersion', version: 'v2' } as const;
    const duplicate = { ...job, kind: 'DuplicateVersion', version: 'v1' } as const;
    const remove = { ...job, kind: 'DeleteVersion', version: 'v2' } as const;
    expect(versionOutcome(publish, result('done', null), words)).toEqual({
      ok: true,
      text: 'published 2 of plaza',
      made: null,
    });
    expect(versionOutcome(remove, result('done', null), words)).toEqual({
      ok: true,
      text: 'deleted 2 of plaza',
      made: null,
    });
    // A duplicate speaks of the version it made.
    expect(versionOutcome(duplicate, result('done', null, 'v3'), words)).toEqual({
      ok: true,
      text: 'copy of plaza is 3',
      made: 'v3',
    });
    expect(versionOutcome(duplicate, result('done', null), words)?.text).toBe('copy of plaza is 1');
    // A refusal the machine names, with or without its detail, and one it does not.
    expect(versionOutcome(publish, result('failed', 'switch-stuck'), words)).toEqual({
      ok: false,
      text: 'switch-stuck on open-1 v2',
      made: null,
    });
    expect(versionOutcome(duplicate, result('failed', 'no-room: 3 MB free'), words)?.text).toBe(
      'no-room on open-1 v1',
    );
    expect(versionOutcome(duplicate, result('failed', 'weird'), words)?.text).toBe(
      'open-1 failed (weird)',
    );
    expect(versionOutcome(duplicate, result('failed', null), words)?.text).toBe(
      'open-1 failed (?)',
    );
    // Not finished, or not read: nothing to tell yet.
    expect(versionOutcome(publish, result('working', null), words)).toBeNull();
    expect(versionOutcome(publish, result('pending', null), words)).toBeNull();
    expect(versionOutcome(publish, null, words)).toBeNull();
  });
});

describe('what a door says about versions', () => {
  const INFO = (id: string, published: boolean | string, extra: Record<string, unknown> = {}) => ({
    id,
    published,
    bytes: 1048576,
    createdAt: '2026-10-22T08:00:00Z',
    origin: 'created',
    ...extra,
  });

  it('reads whether a machine keeps versions, and how many; nothing from an older door', () => {
    expect(readVersionsSupport({ versions: { max: 2 } })).toEqual({ max: 2 });
    expect(readVersionsSupport({ versions: { max: 2, later: true }, other: 1 })).toEqual({
      max: 2,
    });
    for (const odd of [
      {},
      null,
      'versions',
      { versions: 2 },
      { versions: null },
      { versions: {} },
      { versions: { max: 0 } },
      { versions: { max: -1 } },
      { versions: { max: 1.5 } },
      { versions: { max: '2' } },
      { versions: { max: 2 ** 60 } },
    ]) {
      expect(readVersionsSupport(odd)).toBeNull();
    }
  });

  it('reads the versions of a world by number, dropping any entry it cannot trust', () => {
    const list = readVersions([
      INFO('v10', false, { origin: 'copy:v2', bytes: null, createdAt: null }),
      INFO('v2', false, { origin: 'zip' }),
      INFO('v1', true, { unknown: 'key' }),
      INFO('v2', true), // the same name twice: the first stays
      INFO('v3', false, { origin: 'copy:' }),
      INFO('v4', false, { origin: 7 }),
      INFO('v5', 'yes'),
      INFO('x6', false),
      { ...INFO('v7', false), id: 7 },
      INFO('v8', false, { bytes: -1, createdAt: 'a\nb' }),
      INFO('v9', false, { bytes: 1.5, createdAt: 12 }),
      'junk',
      null,
    ]);
    expect(list).toEqual([
      {
        id: 'v1',
        published: true,
        bytes: 1048576,
        createdAt: '2026-10-22T08:00:00Z',
        origin: 'created',
      },
      {
        id: 'v2',
        published: false,
        bytes: 1048576,
        createdAt: '2026-10-22T08:00:00Z',
        origin: 'zip',
      },
      { id: 'v8', published: false, bytes: null, createdAt: null, origin: 'created' },
      { id: 'v9', published: false, bytes: null, createdAt: null, origin: 'created' },
      { id: 'v10', published: false, bytes: null, createdAt: null, origin: 'copy:v2' },
    ]);
    // A machine that could not read its metadata sends none: the room gets an empty list, not a guess.
    expect(readVersions([])).toEqual([]);
    for (const odd of [undefined, null, 'v1', {}, 3]) expect(readVersions(odd)).toBeNull();
  });

  it('reads the version on its way: what kind, how far, and how much of its zip has arrived', () => {
    expect(readVersionComing({ kind: 'duplicate', state: 'waiting' })).toEqual({
      kind: 'duplicate',
      state: 'waiting',
    });
    expect(readVersionComing({ kind: 'import', state: 'working', future: 1 })).toEqual({
      kind: 'import',
      state: 'working',
    });
    expect(readVersionComing({ kind: 'import', state: 'uploading', bytes: 10, of: 100 })).toEqual({
      kind: 'import',
      state: 'uploading',
      bytes: 10,
      of: 100,
    });
    // Progress that does not add up is left out; the state stays.
    for (const progress of [
      { bytes: 5 },
      { bytes: 200, of: 100 },
      { bytes: 1, of: 0 },
      { bytes: -1, of: 3 },
    ]) {
      expect(readVersionComing({ kind: 'import', state: 'uploading', ...progress })).toEqual({
        kind: 'import',
        state: 'uploading',
      });
    }
    for (const odd of [
      undefined,
      null,
      'import',
      {},
      { kind: 'import' },
      { state: 'working' },
      { kind: 'delete', state: 'working' },
      { kind: 'import', state: 'done' },
    ]) {
      expect(readVersionComing(odd)).toBeNull();
    }
  });

  it('reads the versions and the version coming in a world’s listing, and the phase `switching`', () => {
    const worlds = readDoorWorlds(
      {
        worlds: [
          listed('plaza', 'running', {
            versions: [INFO('v1', true), INFO('v2', false, { origin: 'copy:v1' })],
            versionComing: { kind: 'import', state: 'uploading', bytes: 1, of: 2 },
          }),
          listed('foro', 'switching', { versions: [INFO('v2', true), INFO('v1', false)] }),
          // An older door: neither key.
          listed('vieja', 'stopped'),
          // Unreadable metadata: an empty list is kept as the door's word; a bad coming is dropped.
          listed('rota', 'running', { versions: [], versionComing: { kind: 'x' } }),
          // Born, importing and deleting worlds have neither, whatever they carry.
          {
            id: 'otra',
            domain: 'otra.numinia.com',
            phase: 'importing',
            versions: [INFO('v1', true)],
          },
          { id: 'ida', domain: 'ida.numinia.com', phase: 'deleting', versions: [INFO('v1', true)] },
        ],
      },
      'open-1',
    );
    expect(worlds?.map((world) => world.id)).toEqual([
      'plaza',
      'foro',
      'vieja',
      'rota',
      'otra',
      'ida',
    ]);
    const byId = Object.fromEntries((worlds ?? []).map((world) => [world.id, world]));
    expect(byId['plaza']?.versions?.map((version) => version.id)).toEqual(['v1', 'v2']);
    expect(byId['plaza']?.versionComing).toEqual({
      kind: 'import',
      state: 'uploading',
      bytes: 1,
      of: 2,
    });
    expect(byId['foro']?.phase).toBe('switching');
    expect(byId['foro']?.versions?.map((version) => version.id)).toEqual(['v1', 'v2']);
    expect(byId['vieja']).not.toHaveProperty('versions');
    expect(byId['vieja']).not.toHaveProperty('versionComing');
    expect(byId['rota']?.versions).toEqual([]);
    expect(byId['rota']).not.toHaveProperty('versionComing');
    expect(byId['otra']).not.toHaveProperty('versions');
    expect(byId['ida']).not.toHaveProperty('versions');
  });

  it('reads a machine’s versions.max through its door, and none from a door that says nothing', async () => {
    const MACHINE = 'https://open-1.numinia.com/fleet/v1/machine';
    const WORLDS = 'https://open-1.numinia.com/fleet/v1/worlds';
    const said = fakeFetch((url) => {
      if (url === WORLDS) return json({ worlds: [] });
      if (url === MACHINE) return json({ versions: { max: 2 } });
      return json({ entries: [] });
    });
    const view = await readMachine(said.fetch, 'open-1');
    expect(view.open && view.versions).toEqual({ max: 2 });
    const silent = fakeFetch((url) => (url === WORLDS ? json({ worlds: [] }) : json({})));
    const older = await readMachine(silent.fetch, 'open-1');
    expect(older.open && older.versions).toBeNull();
  });

  it('gathers the versions and the version coming by world, from the first machine that holds it', () => {
    const versions: VersionInfo[] = [
      { id: 'v1', published: true, bytes: 10, createdAt: null, origin: 'created' },
      { id: 'v2', published: false, bytes: null, createdAt: null, origin: 'copy:v1' },
    ];
    const view = (
      alias: string,
      more: Partial<Extract<MachineView, { open: true }>>,
    ): MachineView => ({
      alias,
      open: true,
      worlds: [],
      log: [],
      heartbeat: null,
      listens: [],
      recipe: null,
      imports: null,
      ...more,
    });
    const fleet = gatherFleet([
      view('open-1', {
        versions: { max: 2 },
        worlds: [
          {
            id: 'plaza',
            phase: 'running',
            order: order('plaza'),
            domain: 'plaza.numinia.com',
            upload: null,
            versions,
            versionComing: { kind: 'duplicate', state: 'waiting' },
          },
          {
            id: 'foro',
            phase: 'running',
            order: order('foro'),
            domain: 'foro.numinia.com',
            upload: null,
          },
        ],
      }),
      view('open-2', {
        worlds: [
          {
            id: 'plaza',
            phase: 'running',
            order: order('plaza', { server: 'open-2' }),
            domain: 'plaza.numinia.com',
            upload: null,
            versions: [],
          },
        ],
      }),
    ]);
    expect(fleet.versions).toEqual({ plaza: versions });
    expect(fleet.versionComing).toEqual({ plaza: { kind: 'duplicate', state: 'waiting' } });
    expect(fleet.machines.map((machine) => machine.versions)).toEqual([{ max: 2 }, null]);
  });
});
