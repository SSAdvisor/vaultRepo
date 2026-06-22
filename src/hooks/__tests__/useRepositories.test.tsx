import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRepositories, useFiles } from '../useRepositories';
import { supabase } from '../../lib/supabase';
import * as useAuthModule from '../useAuth';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn()
}));

const mockUser = { id: 'user-1', email: 'test@test.com' };

describe('useRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthModule.useAuth as any).mockReturnValue({ user: mockUser });
    
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'repo-1', name: 'my-repo' }], error: null });
    
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      order: mockOrder
    });
  });

  it('fetches repositories on mount', async () => {
    const { result } = renderHook(() => useRepositories());
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    expect(supabase.from).toHaveBeenCalledWith('repositories');
    expect(result.current.repositories).toEqual([{ id: 'repo-1', name: 'my-repo' }]);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch if user is not authenticated', async () => {
    (useAuthModule.useAuth as any).mockReturnValue({ user: null });
    
    const { result } = renderHook(() => useRepositories());
    
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('useFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthModule.useAuth as any).mockReturnValue({ user: mockUser });
    
    const mockOrder = vi.fn().mockReturnThis();
    const mockOrder2 = vi.fn().mockResolvedValue({ data: [{ id: 'file-1', path: '/', filename: 'test.txt' }], error: null });
    
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mockOrder.mockImplementationOnce(() => ({ order: mockOrder2 }))
    });
  });

  it('fetches files on mount when repositoryId is provided', async () => {
    const { result } = renderHook(() => useFiles('repo-1'));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    expect(supabase.from).toHaveBeenCalledWith('files');
    expect(result.current.files).toEqual([{ id: 'file-1', path: '/', filename: 'test.txt' }]);
  });
});
