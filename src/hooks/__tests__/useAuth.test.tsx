import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      cb('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('throws an error if used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });

  it('initializes with null user and session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('calls signInWithPassword when signIn is invoked', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await act(async () => {
      const res = await result.current.signIn('test@test.com', 'password');
      expect(res.error).toBeNull();
    });
    
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password' });
  });

  it('calls signUp when signUp is invoked', async () => {
    (supabase.auth.signUp as any).mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await act(async () => {
      const res = await result.current.signUp('test@test.com', 'password');
      expect(res.error).toBeNull();
    });
    
    expect(supabase.auth.signUp).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password' });
  });

  it('calls signOut and clears state when signOut is invoked', async () => {
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await act(async () => {
      await result.current.signOut();
    });
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});
