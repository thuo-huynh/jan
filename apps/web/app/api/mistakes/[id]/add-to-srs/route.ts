import { NextResponse } from 'next/server';

/** Compatibility response for the retired mistake-notebook feature. */
export async function POST() {
  return NextResponse.json(
    { error: 'Sổ lỗi sai đã ngừng hoạt động. Hãy thêm mục cần ôn trực tiếp vào kho học của bạn.' },
    { status: 410 },
  );
}
