import { NextRequest, NextResponse } from 'next/server';
import { nftCheckRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ERC-721 balanceOf / ERC-1155 balanceOf ABI fragments
const ERC721_BALANCE_OF = '0x70a08231'; // balanceOf(address)
const ERC1155_BALANCE_OF = '0x00fdd58e'; // balanceOf(address, uint256)

// Base chain RPC (public)
const BASE_RPC = 'https://mainnet.base.org';

function padAddress(address: string): string {
  return '0x' + address.slice(2).toLowerCase().padStart(64, '0');
}

function padUint256(value: string): string {
  return '0x' + BigInt(value).toString(16).padStart(64, '0');
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function GET(req: NextRequest) {
  const rl = await nftCheckRateLimit(getRateLimitKey(req));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const address = req.nextUrl.searchParams.get('address');
  const contract = req.nextUrl.searchParams.get('contract');
  const tokenId = req.nextUrl.searchParams.get('tokenId');
  const type = req.nextUrl.searchParams.get('type') || 'ERC-721';

  if (!address || !contract) {
    return NextResponse.json({ error: 'address and contract required' }, { status: 400 });
  }

  try {
    let balance: bigint;

    if (type === 'ERC-1155') {
      if (!tokenId) {
        return NextResponse.json({ error: 'tokenId required for ERC-1155' }, { status: 400 });
      }
      // balanceOf(address, tokenId)
      const data = ERC1155_BALANCE_OF +
        padAddress(address).slice(2) +
        padUint256(tokenId).slice(2);
      const result = await ethCall(contract, data);
      balance = BigInt(result);
    } else {
      // ERC-721 balanceOf(address)
      const data = ERC721_BALANCE_OF + padAddress(address).slice(2);
      const result = await ethCall(contract, data);
      balance = BigInt(result);
    }

    return NextResponse.json({
      owns: balance > BigInt(0),
      balance: balance.toString(),
      address,
      contract,
      tokenId: tokenId || null,
      type,
      chain: 'base',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RPC call failed' },
      { status: 500 },
    );
  }
}
