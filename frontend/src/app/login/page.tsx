'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/common';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-500 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo-vertical-white.png"
              alt="Dar Blockchain"
              width={200}
              height={200}
              priority
              className="w-48 h-auto"
            />
          </div>
          <h2 className="text-2xl font-semibold mb-6 text-center">Project Management</h2>
          <p className="text-lg text-primary-50 text-center">
            Streamline your workflow. Track issues, manage sprints, and deliver great products
            with our comprehensive project management solution.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-600 mb-8">Sign in to your account to continue</p>

            {error && (
              <div className="mb-6 p-4 bg-danger-50 border-2 border-danger-200 rounded-md">
                <p className="text-sm text-danger-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Demo Accounts:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>Admin: admin@darblockchain.com</li>
                  <li>PM: pm@darblockchain.com</li>
                  <li>Developer: john.dev@darblockchain.com</li>
                  <li className="mt-2">Password: password123</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
