/**
 * Thirdweb NFT minting service for Season Pass.
 *
 * Mints an ERC-1155 token on Base (or Base Sepolia) to a buyer's wallet
 * after a successful Stripe payment.
 *
 * Degrades gracefully: if env vars are not configured, returns null
 * and the pass still works via GitHub JSON.
 */

import { createThirdwebClient, getContract, sendAndConfirmTransaction } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { claimTo } from 'thirdweb/extensions/erc1155';
import { env } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/thirdweb-mint');

export function isThirdwebConfigured(): boolean {
  return !!(
    env.thirdweb.secretKey &&
    env.thirdweb.mintPrivateKey &&
    env.thirdweb.contractAddress
  );
}

/**
 * Mint a Season Pass NFT (ERC-1155) to the given wallet address.
 *
 * @param toAddress - The wallet to receive the NFT
 * @param tokenId - The ERC-1155 token ID (default 0 = Season I Pass)
 * @returns Mint result with tx hash and token ID, or null if not configured
 */
export async function mintSeasonPass(
  toAddress: string,
  tokenId: number = 0,
): Promise<{ transactionHash: string; tokenId: string } | null> {
  if (!isThirdwebConfigured()) {
    log.warn('Thirdweb not configured — skipping NFT mint');
    return null;
  }

  const client = createThirdwebClient({
    secretKey: env.thirdweb.secretKey,
  });

  const chain = defineChain(parseInt(env.thirdweb.chainId));

  const account = privateKeyToAccount({
    client,
    privateKey: env.thirdweb.mintPrivateKey,
  });

  const contract = getContract({
    client,
    chain,
    address: env.thirdweb.contractAddress,
  });

  // Contract is an ERC-1155 Drop — use claimTo (not mintAdditionalSupplyTo)
  const transaction = claimTo({
    contract,
    to: toAddress,
    tokenId: BigInt(tokenId),
    quantity: BigInt(1),
  });

  const receipt = await sendAndConfirmTransaction({ transaction, account });

  return {
    transactionHash: receipt.transactionHash,
    tokenId: tokenId.toString(),
  };
}
