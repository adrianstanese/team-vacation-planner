// app/api/stats/route.ts
// Returns aggregate team and member counts

import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Count non-expired teams
    const teams = await prisma.team.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: { data: true },
    });

    let teamCount = teams.length;
    let memberCount = 0;

    for (const team of teams) {
      const data = team.data as any;
      if (data && data.members) {
        memberCount += data.members.length;
      }
    }

    return NextResponse.json({
      teams: teamCount,
      members: memberCount,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ teams: 0, members: 0 });
  }
}
