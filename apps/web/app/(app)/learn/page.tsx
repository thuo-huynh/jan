import Link from 'next/link';
import { ArrowRight, BookOpen, Headphones, Languages, RotateCw } from 'lucide-react';

const destinations = [
  { href: '/learn/review', title: 'Ôn tập hôm nay', description: 'Quay lại với những mục đang đến hạn.', icon: RotateCw },
  { href: '/learn/vocab', title: 'Từ vựng', description: 'Thêm từ, xem bộ từ và học bằng flashcard.', icon: BookOpen },
  { href: '/learn/grammar', title: 'Ngữ pháp', description: 'Học mẫu câu, ví dụ và ghi chú cá nhân.', icon: Languages },
  { href: '/learn/reading', title: 'Đọc hiểu', description: 'Đọc bài, trả lời câu hỏi và lưu tiến độ.', icon: BookOpen },
  { href: '/learn/listening', title: 'Nghe hiểu', description: 'Ghi lại các buổi nghe và shadowing.', icon: Headphones },
];

export default function LearnPage() {
  return <div className="space-y-8"><div className="max-w-2xl"><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Không gian học tập</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Chọn một điều bạn muốn tiếp tục. Mỗi khu vực giữ nguyên cách học phù hợp với nội dung đó.</p></div><div className="grid gap-3 md:grid-cols-2">{destinations.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="card-interactive group flex items-start gap-4 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold text-foreground">{title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span></span><ArrowRight className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>)}</div></div>;
}
