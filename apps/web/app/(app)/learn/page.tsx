import Link from 'next/link';
import { ArrowRight, BookOpen, Headphones, Languages, RotateCw } from 'lucide-react';

const destinations = [
  {
    href: '/learn/review',
    title: 'Ôn tập hôm nay',
    description: 'Quay lại với những mục đang đến hạn.',
    icon: RotateCw,
  },
  {
    href: '/learn/vocab',
    title: 'Từ vựng',
    description: 'Thêm từ, xem bộ từ và học bằng flashcard.',
    icon: BookOpen,
  },
  {
    href: '/learn/grammar',
    title: 'Ngữ pháp',
    description: 'Học mẫu câu, ví dụ và ghi chú cá nhân.',
    icon: Languages,
  },
  {
    href: '/learn/reading',
    title: 'Đọc hiểu',
    description: 'Đọc bài, trả lời câu hỏi và lưu tiến độ.',
    icon: BookOpen,
  },
  {
    href: '/learn/listening',
    title: 'Nghe hiểu',
    description: 'Ghi lại các buổi nghe và shadowing.',
    icon: Headphones,
  },
];

export default function LearnPage() {
  return (
    <div className="space-y-9">
      <div>
        <h1 className="page-heading">Không gian học</h1>
        <p className="page-intro">
          Chọn điều bạn muốn quay lại. Mỗi khu vực giữ tài liệu và tiến độ theo cách phù hợp với
          bạn.
        </p>
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
        {destinations.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="hover:bg-muted/60 group flex items-start gap-4 bg-card p-5 transition-colors sm:p-6"
          >
            <span className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary">
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-foreground">{title}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                {description}
              </span>
            </span>
            <ArrowRight
              className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
