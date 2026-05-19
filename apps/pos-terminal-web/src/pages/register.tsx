import { FormEvent, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerWithEmailAndUsername } from '@/lib/auth';

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await registerWithEmailAndUsername({ name, email, username, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.message || 'Register gagal. Coba lagi.');
      return;
    }

    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-bold">Register POS</h1>
        <p className="text-sm text-slate-500">Daftar dengan nama, email, username, dan password.</p>
        <Input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Memproses...' : 'Register'}</Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/login')}>Sudah punya akun? Login</Button>
      </form>
    </div>
  );
}
