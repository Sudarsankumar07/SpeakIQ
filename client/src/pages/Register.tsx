import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Mail, Lock, User, Mic, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password);
      toast.success('Registration successful! Welcome to SpeakIQ.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-slate-50 to-cyan-50">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200 opacity-30 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-200 opacity-30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel rounded-3xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-300">
              <Mic className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Start evaluating your English-speaking ability
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white/50 py-3 pl-10 pr-3 text-slate-950 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white/50 py-3 pl-10 pr-3 text-slate-950 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white/50 py-3 pl-10 pr-3 text-slate-950 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm Password</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white/50 py-3 pl-10 pr-3 text-slate-950 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-2xl bg-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          </form>

          {/* Footer link */}
          <p className="mt-8 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
            >
              Log in instead
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
