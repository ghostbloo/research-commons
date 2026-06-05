import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Avatar from './Avatar.vue';

describe('Avatar', () => {
  it('renders the uppercased first initial and the name as the title', () => {
    const wrapper = mount(Avatar, {
      props: { participant: { name: 'Claude', type: 'model' } },
    });
    expect(wrapper.text()).toBe('C');
    expect(wrapper.attributes('title')).toBe('Claude');
  });

  it('uses the known-model purple for Claude', () => {
    const wrapper = mount(Avatar, {
      props: { participant: { name: 'Claude', type: 'model' } },
    });
    // jsdom serializes #8b5cf6 as rgb(...).
    expect(wrapper.attributes('style')).toContain('rgb(139, 92, 246)');
  });

  it('falls back to a generated (non-model) color for unknown names', () => {
    const wrapper = mount(Avatar, {
      props: { participant: { name: 'Zephyr', type: 'human' } },
    });
    expect(wrapper.text()).toBe('Z');
    const style = wrapper.attributes('style') ?? '';
    // jsdom serializes both hex and hsl() to rgb(); just assert a color is applied
    // and it isn't the known-model purple used for Claude.
    expect(style).toContain('background-color');
    expect(style).not.toContain('rgb(139, 92, 246)');
  });
});
