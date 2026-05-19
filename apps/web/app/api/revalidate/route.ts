import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// T-055: Cache invalidation route handler.
// POST /api/revalidate
// body: { secret: string, paths?: string[], tags?: string[] }

interface RevalidateBody {
  secret: string;
  paths?: string[];
  tags?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: RevalidateBody;

  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json(
      { revalidated: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const secret = process.env['REVALIDATE_SECRET'];
  if (!secret || body.secret !== secret) {
    return NextResponse.json(
      { revalidated: false, error: 'Invalid revalidation secret' },
      { status: 401 },
    );
  }

  const revalidatedPaths: string[] = [];
  const revalidatedTags: string[] = [];

  if (Array.isArray(body.paths)) {
    for (const path of body.paths) {
      revalidatePath(path);
      revalidatedPaths.push(path);
    }
  }

  if (Array.isArray(body.tags)) {
    for (const tag of body.tags) {
      revalidateTag(tag);
      revalidatedTags.push(tag);
    }
  }

  return NextResponse.json({
    revalidated: true,
    paths: revalidatedPaths,
    tags: revalidatedTags,
  });
}
