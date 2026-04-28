import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { BlurCard } from '../components/BlurCard';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

describe('BlurCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <BlurCard><Text>hello</Text></BlurCard>
    );
    expect(getByText('hello')).toBeTruthy();
  });
});
