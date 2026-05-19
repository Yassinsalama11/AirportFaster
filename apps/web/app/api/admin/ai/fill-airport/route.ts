import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

const MODEL = process.env['OPENAI_MODEL'] ?? 'gpt-4o';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export interface AirportAIResult {
  iataCode: string;
  icaoCode: string;
  enDescription: string;
  arName: string;
  arDescription: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoOgTitle: string;
  seoOgDescription: string;
  canonicalUrl: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { airportName?: string };
    const airportName = body.airportName?.trim();

    if (!airportName) {
      return NextResponse.json({ success: false, error: 'airportName is required' }, { status: 400 });
    }

    if (!process.env['OPENAI_API_KEY']) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const slug = slugify(airportName);
    const canonicalUrl = `${BASE_URL}/airports/${slug}`;

    const prompt = `You are an aviation data expert. Given the airport name "${airportName}", provide accurate information.

Return a JSON object with EXACTLY these fields:
{
  "iataCode": "3-letter IATA code (e.g. DXB, LHR, JFK)",
  "icaoCode": "4-letter ICAO code (e.g. OMDB, EGLL, KJFK)",
  "enDescription": "2-3 sentence description of the airport in English, mentioning its location, significance, and key services. Suitable for a travel marketplace.",
  "arName": "Official Arabic name of the airport (e.g. مطار دبي الدولي)",
  "arDescription": "2-3 sentence description in Arabic matching the English description. Natural, fluent Arabic suitable for a travel marketplace.",
  "seoMetaTitle": "SEO meta title, max 60 chars, format: '{Airport Name} ({IATA}) — Premium Airport Services | AirportFaster'",
  "seoMetaDescription": "SEO meta description, max 155 chars, mentioning fast track, meet & greet, lounge access, and the city name.",
  "seoOgTitle": "OpenGraph title, same as or slight variation of seoMetaTitle, max 70 chars",
  "seoOgDescription": "OpenGraph description, 1-2 sentences, engaging and concise, max 120 chars",
  "canonicalUrl": "${canonicalUrl}"
}

Rules:
- iataCode must be exactly 3 uppercase letters
- icaoCode must be exactly 4 uppercase letters
- canonicalUrl must be exactly "${canonicalUrl}"
- If you are not confident about the IATA/ICAO code, use your best knowledge but indicate uncertainty with a comment in the description
- All text must be accurate and professional
- Arabic text must be grammatically correct Modern Standard Arabic`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an aviation data expert. Always respond with valid JSON only, no markdown, no explanation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ success: false, error: 'Empty response from AI' }, { status: 500 });
    }

    const data = JSON.parse(content) as AirportAIResult;

    // Enforce canonical URL regardless of what AI returned
    data.canonicalUrl = canonicalUrl;

    // Enforce IATA/ICAO format
    if (data.iataCode) data.iataCode = data.iataCode.toUpperCase().slice(0, 3);
    if (data.icaoCode) data.icaoCode = data.icaoCode.toUpperCase().slice(0, 4);

    // Enforce SEO length limits
    if (data.seoMetaTitle && data.seoMetaTitle.length > 60) {
      data.seoMetaTitle = data.seoMetaTitle.slice(0, 57) + '…';
    }
    if (data.seoMetaDescription && data.seoMetaDescription.length > 155) {
      data.seoMetaDescription = data.seoMetaDescription.slice(0, 152) + '…';
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
