'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { AuthShell } from '@/shared/components/AuthShell';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthShell>
        <LoginForm />
      </AuthShell>
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const redirectTo = searchParams.get('redirectTo') ?? '/boards';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Đăng nhập</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Chào mừng bạn quay lại JanGo.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="label-field">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="password" className="label-field">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
