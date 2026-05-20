import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const COOKIE_NAME = 'airportfaster_session';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function buildTargetUrl(path: string[], request: NextRequest): string {
  const target = new URL(`/api/admin/${path.join('/')}`, API_URL);
  target.search = request.nextUrl.search;
  return target.toString();
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  const contentType = source.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  return headers;
}

async function proxyAdminRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(path, request);
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (sessionToken) headers.set('cookie', `${COOKIE_NAME}=${sessionToken}`);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.arrayBuffer();
  }

  const apiResponse = await fetch(targetUrl, fetchOptions);

  return new NextResponse(apiResponse.body, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
    headers: copyResponseHeaders(apiResponse.headers),
  });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyAdminRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyAdminRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyAdminRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyAdminRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyAdminRequest(request, context);
}
