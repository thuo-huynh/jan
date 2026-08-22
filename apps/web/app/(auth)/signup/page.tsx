'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { AuthShell } from '@/shared/components/AuthShell';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // A `profiles` row is created automatically via the on_auth_user_created
    // trigger (0001_profiles.sql) — no separate profile-creation call needed.
    if (!data.session) {
      // Email confirmation is required before a session exists.
      setConfirmationSent(true);
      return;
    }
    router.push('/boards');
    router.refresh();
  }

  return (
    <AuthShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tạo tài khoản của bạn</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Bắt đầu theo dõi công việc và tiến độ học N2 của bạn.
        </p>

        {confirmationSent ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-foreground">
              Kiểm tra email để xác nhận tài khoản trước khi đăng nhập.
            </p>
          </div>
        ) : (
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
              <p className="helper-text">Ít nhất 8 ký tự.</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="label-field">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
