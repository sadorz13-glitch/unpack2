import { Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';
import { TRAITS } from '../constants';

const { width } = Dimensions.get('window');

type FullRadarProps = { traits: Record<string, number> };

export function FullRadar({ traits }: FullRadarProps) {
  const size = width - 80;
  const center = size / 2;
  const radius = size / 2 - 40;
  const num = TRAITS.length;

  function getPoint(index: number, value: number): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / num - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  }

  function getLabelPoint(index: number): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / num - Math.PI / 2;
    return { x: center + (radius + 24) * Math.cos(angle), y: center + (radius + 24) * Math.sin(angle) };
  }

  const points = TRAITS.map((t, i) => getPoint(i, traits[t] || 0));
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <Svg width={size} height={size}>
      {gridLevels.map(level => (
        <Polygon key={level} points={TRAITS.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="rgba(180,140,90,0.1)" strokeWidth="1" />
      ))}
      {TRAITS.map((_, i) => { const p = getPoint(i, 100); return <Line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(180,140,90,0.1)" strokeWidth="1" />; })}
      <Polygon points={polygonPoints} fill="rgba(180,140,90,0.15)" stroke={colors['accent-gold']} strokeWidth="2" />
      {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r="4" fill={colors['accent-gold']} />)}
      {TRAITS.map((trait, i) => { const lp = getLabelPoint(i); return <SvgText key={i} x={lp.x} y={lp.y} fill="#6b6560" fontSize="11" textAnchor="middle" alignmentBaseline="middle">{trait}</SvgText>; })}
    </Svg>
  );
}
