import { FormEvent, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginWithEmailOrUsername } from '@/lib/auth';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await loginWithEmailOrUsername({ identifier, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.message || 'Login gagal. Coba lagi.');
      return;
    }

    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-bold">Login POS</h1>
        <p className="text-sm text-slate-500">Masuk pakai email atau username + password.</p>
        <Input placeholder="Email atau username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Memproses...' : 'Login'}</Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/register')}>Belum punya akun? Register</Button>
      </form>
    </div>
  );
}
