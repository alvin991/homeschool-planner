import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Course from '@/models/Course';

export async function GET() {
  return new Response('Hello, this is the Course API!');
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const data = await request.json();

  try {
    const course = await Course.create(data);
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}