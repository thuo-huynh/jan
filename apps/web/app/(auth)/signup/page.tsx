'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';

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
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start tracking tasks and your N2 study progress.
        </p>

        {confirmationSent ? (
          <p className="mt-6 rounded-md bg-muted p-3 text-sm text-foreground">
            Check your email to confirm your account before signing in.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
