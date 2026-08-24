import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT } from '../src/lib/prompts.js';

describe('SYSTEM_PROMPT', () => {
  it('identifies the assistant as Hapines', () => {
    expect(SYSTEM_PROMPT).toContain('Hapines');
  });

  it('explicitly disclaims being a therapist or medical provider', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('not a therapist');
  });

  it('instructs redirecting self-harm or crisis disclosures to real support, not handling them directly', () => {
    const lower = SYSTEM_PROMPT.toLowerCase();
    expect(lower).toContain('self-harm');
    expect(lower).toMatch(/trusted person|emergency|crisis line/);
    expect(lower).toContain('do not attempt to handle the crisis yourself');
  });

  it('instructs against diagnosing or making claims about the user\'s mental state', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('do not make claims about the user\'s mental state');
  });
});