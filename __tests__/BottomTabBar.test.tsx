import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomTabBar } from '../components/BottomTabBar';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const El = ({ children, ...props }: any) => React.createElement(View, props, children);
  return { __esModule: true, default: El, Svg: El, Path: El, Rect: El, Circle: El, Line: El };
});

describe('BottomTabBar', () => {
  it('renders 4 tappable tabs', () => {
    const { getAllByRole } = render(
      <BottomTabBar activeTab={0} onTabPress={jest.fn()} />
    );
    expect(getAllByRole('button').length).toBe(4);
  });

  it('calls onTabPress with correct index', () => {
    const onTabPress = jest.fn();
    const { getAllByRole } = render(
      <BottomTabBar activeTab={0} onTabPress={onTabPress} />
    );
    fireEvent.press(getAllByRole('button')[2]); // Talk tab (index 2)
    expect(onTabPress).toHaveBeenCalledWith(2);
  });
});
