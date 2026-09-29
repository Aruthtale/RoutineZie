// __tests__ folder not needed - everything is inline

// Test ChatProvider directly
import { describe, it, expect, vi } from 'vitest';
import { MockChatProvider } from '@/lib/providers/chat/providers';

describe('MockChatProvider', () => {
  it('should return a greeting message when no messages are provided', async () => {
    const mockProvider = new MockChatProvider();
    const result = await mockProvider.send({ 
      messages: [], 
      context: {} as any, 
      signal: {} as any 
    });
    expect(result).toContain('Halo');
  });

  it('should respond to workout-related queries', async () => {
    const mockProvider = new MockChatProvider();
    const result = await mockProvider.send({
      messages: [{ role: 'user', text: 'Cara melakukan latihan?' }],
      context: {} as any,
      signal: {} as any,
    });
    expect(result).toContain('latihan');
  });

  it('should respond to meal-related queries', async () => {
    const mockProvider = new MockChatProvider();
    const result = await mockProvider.send({
      messages: [{ role: 'user', text: 'Menu makan hari ini?' }],
      context: {} as any,
      signal: {} as any,
    });
    expect(result).toContain('menu makan');
  });
});