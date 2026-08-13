import { describe, expect, it } from 'vitest';
import {
  ownedConversationIdForSafetyEvent,
  sanitizeLysConversationMessages,
  titleFromLysMessages,
} from './lysConversations';

describe('sanitizeLysConversationMessages', () => {
  it('accepts user/assistant messages and trims content', () => {
    expect(
      sanitizeLysConversationMessages([
        { role: 'user', content: '  hej  ' },
        { role: 'assistant', content: 'hej med dig' },
      ])
    ).toEqual([
      { role: 'user', content: 'hej' },
      { role: 'assistant', content: 'hej med dig' },
    ]);
  });

  it('rejects non-arrays, bad roles, and empty content', () => {
    expect(sanitizeLysConversationMessages(null)).toBeNull();
    expect(sanitizeLysConversationMessages('x')).toBeNull();
    expect(sanitizeLysConversationMessages([{ role: 'system', content: 'x' }])).toBeNull();
    expect(sanitizeLysConversationMessages([{ role: 'user', content: '   ' }])).toBeNull();
    expect(sanitizeLysConversationMessages([{ role: 'user', content: 1 }])).toBeNull();
  });

  it('keeps only the last 40 messages', () => {
    const input = Array.from({ length: 42 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }));
    const out = sanitizeLysConversationMessages(input);
    expect(out).toHaveLength(40);
    expect(out?.[0]?.content).toBe('m2');
    expect(out?.[39]?.content).toBe('m41');
  });
});

describe('titleFromLysMessages', () => {
  it('uses the first user utterance, capped at 60 chars', () => {
    expect(
      titleFromLysMessages([
        { role: 'assistant', content: 'velkommen' },
        { role: 'user', content: 'jeg har det svært i dag og vil gerne tale' },
      ])
    ).toBe('jeg har det svært i dag og vil gerne tale');
  });

  it('returns null when there is no user message', () => {
    expect(titleFromLysMessages([{ role: 'assistant', content: 'hej' }])).toBeNull();
  });
});

describe('ownedConversationIdForSafetyEvent', () => {
  const conv = '11111111-1111-4111-8111-111111111111';
  const residentA = '22222222-2222-4222-8222-222222222222';
  const residentB = '33333333-3333-4333-8333-333333333333';

  it('attaches the id only when the conversation belongs to the same resident', () => {
    expect(
      ownedConversationIdForSafetyEvent({
        conversationId: conv,
        eventResidentId: residentA,
        rowResidentId: residentA,
      })
    ).toBe(conv);
  });

  it('drops the id when missing, unknown, or owned by another resident', () => {
    expect(
      ownedConversationIdForSafetyEvent({
        conversationId: null,
        eventResidentId: residentA,
        rowResidentId: residentA,
      })
    ).toBeNull();
    expect(
      ownedConversationIdForSafetyEvent({
        conversationId: conv,
        eventResidentId: residentA,
        rowResidentId: null,
      })
    ).toBeNull();
    expect(
      ownedConversationIdForSafetyEvent({
        conversationId: conv,
        eventResidentId: residentA,
        rowResidentId: residentB,
      })
    ).toBeNull();
  });
});
