import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { DashboardTrendPoint } from '../../../types/api';
import { formatQty } from '../../../utils/format';

type SeriesKey = 'received' | 'delivered' | 'transferred' | 'adjusted';

interface OperationsComparison3DProps {
  data: DashboardTrendPoint[];
}

interface HoveredBar {
  index: number;
  key: SeriesKey;
}

const series: Array<{ key: SeriesKey; label: string; color: string; z: number }> = [
  { key: 'received', label: 'Received', color: '#22c55e', z: 0.42 },
  { key: 'delivered', label: 'Delivered', color: '#6366f1', z: 0.14 },
  { key: 'transferred', label: 'Transferred', color: '#06b6d4', z: -0.14 },
  { key: 'adjusted', label: 'Adjusted', color: '#f59e0b', z: -0.42 },
];

function OperationsScene({
  data,
  hovered,
  setHovered,
}: {
  data: DashboardTrendPoint[];
  hovered: HoveredBar | null;
  setHovered: (value: HoveredBar | null) => void;
}) {
  const maxValue = useMemo(
    () => Math.max(1, ...data.flatMap((row) => [row.received, row.delivered, row.transferred, row.adjusted])),
    [data],
  );

  const xStep = 0.88;
  const xStart = -(Math.max(1, data.length - 1) * xStep) / 2;
  const floorWidth = Math.max(8.4, data.length * xStep + 2.2);

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight intensity={0.78} color="#dbeafe" position={[6, 9, 4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[floorWidth, 5.8]} />
        <meshStandardMaterial color="#0a1429" roughness={0.95} metalness={0.1} />
      </mesh>
      <gridHelper args={[floorWidth, 24, '#2a3e70', '#1c2b50']} position={[0, 0, 0]} />

      {data.map((row, index) => {
        const baseX = xStart + index * xStep;
        return (
          <group key={row.date} position={[baseX, 0, 0]}>
            {series.map((item) => {
              const value = row[item.key];
              const height = Math.max(0.02, (value / maxValue) * 3.4);
              const active = hovered?.index === index && hovered.key === item.key;
              return (
                <mesh
                  key={`${row.date}-${item.key}`}
                  position={[0, height / 2, item.z]}
                  onPointerOver={(event) => {
                    event.stopPropagation();
                    setHovered({ index, key: item.key });
                  }}
                  onPointerOut={(event) => {
                    event.stopPropagation();
                    setHovered(null);
                  }}
                >
                  <boxGeometry args={[0.19, active ? height + 0.06 : height, 0.19]} />
                  <meshStandardMaterial
                    color={item.color}
                    emissive={item.color}
                    emissiveIntensity={active ? 0.24 : 0.08}
                    metalness={0.34}
                    roughness={0.4}
                  />
                  {active ? (
                    <Html center distanceFactor={9}>
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: 'rgba(7, 12, 27, 0.94)',
                          border: `1px solid ${item.color}`,
                          color: '#e2e8f0',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
                        }}
                      >
                        <div style={{ color: item.color, fontWeight: 700 }}>{item.label}</div>
                        <div>{row.date}</div>
                        <div>Qty: {formatQty(value)}</div>
                      </div>
                    </Html>
                  ) : null}
                </mesh>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

export default function OperationsComparison3D({ data }: OperationsComparison3DProps) {
  const [hovered, setHovered] = useState<HoveredBar | null>(null);
  const activeRow = hovered ? data[hovered.index] : null;
  const activeSeries = hovered ? series.find((item) => item.key === hovered.key) : null;
  const totals = useMemo(
    () =>
      data.reduce(
        (sum, row) => ({
          received: sum.received + row.received,
          delivered: sum.delivered + row.delivered,
          transferred: sum.transferred + row.transferred,
          adjusted: sum.adjusted + row.adjusted,
        }),
        { received: 0, delivered: 0, transferred: 0, adjusted: 0 },
      ),
    [data],
  );

  return (
    <div style={{ position: 'relative', height: 280, borderRadius: 14, overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 3.05, 8], fov: 48 }}>
        <OperationsScene data={data} hovered={hovered} setHovered={setHovered} />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 10,
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(9, 15, 33, 0.84)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'var(--txt-secondary)',
          fontSize: '0.78rem',
          lineHeight: 1.45,
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        {activeRow && activeSeries ? (
          <>
            <div style={{ color: 'var(--txt-primary)', fontWeight: 600 }}>{activeRow.date}</div>
            <div>
              {activeSeries.label}: <span style={{ color: activeSeries.color }}>{formatQty(activeRow[activeSeries.key])}</span>
            </div>
            <div>
              R: {formatQty(activeRow.received)} | D: {formatQty(activeRow.delivered)} | T: {formatQty(activeRow.transferred)} | A: {formatQty(activeRow.adjusted)}
            </div>
          </>
        ) : (
          <div>
            Totals - R: {formatQty(totals.received)}, D: {formatQty(totals.delivered)}, T: {formatQty(totals.transferred)}, A: {formatQty(totals.adjusted)}
          </div>
        )}
      </div>
    </div>
  );
}
