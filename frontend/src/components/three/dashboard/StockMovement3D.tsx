import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { DashboardTrendPoint } from '../../../types/api';
import { formatQty } from '../../../utils/format';

type SeriesKey = 'received' | 'delivered' | 'transferred' | 'adjusted';

interface HoveredPoint {
  index: number;
  key: SeriesKey;
}

interface StockMovement3DProps {
  data: DashboardTrendPoint[];
}

const series: Array<{ key: SeriesKey; label: string; color: string; z: number }> = [
  { key: 'received', label: 'Received', color: '#22c55e', z: 0.22 },
  { key: 'delivered', label: 'Delivered', color: '#6366f1', z: 0.07 },
  { key: 'transferred', label: 'Transferred', color: '#06b6d4', z: -0.07 },
  { key: 'adjusted', label: 'Adjusted', color: '#f59e0b', z: -0.22 },
];

function StockMovementScene({
  data,
  hovered,
  setHovered,
}: {
  data: DashboardTrendPoint[];
  hovered: HoveredPoint | null;
  setHovered: (value: HoveredPoint | null) => void;
}) {
  const maxValue = useMemo(() => {
    return Math.max(
      1,
      ...data.flatMap((row) => [row.received, row.delivered, row.transferred, row.adjusted]),
    );
  }, [data]);

  const xSpan = Math.max(6, data.length * 0.55);
  const xStart = -(Math.max(1, data.length - 1) * 0.275);

  const linePoints = useMemo(() => {
    return series.reduce<Record<SeriesKey, THREE.Vector3[]>>((accumulator, item) => {
      accumulator[item.key] = data.map((row, index) => {
        const value = row[item.key];
        return new THREE.Vector3(xStart + index * 0.55, (value / maxValue) * 2.9 + 0.03, item.z);
      });
      return accumulator;
    }, { received: [], delivered: [], transferred: [], adjusted: [] });
  }, [data, maxValue, xStart]);

  return (
    <>
      <ambientLight intensity={0.62} />
      <hemisphereLight intensity={0.22} color="#b2c8ff" groundColor="#081127" />
      <directionalLight intensity={0.75} position={[5, 8, 6]} color="#d9ecff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[xSpan + 2.8, 5.6]} />
        <meshStandardMaterial color="#0a1429" metalness={0.1} roughness={0.95} />
      </mesh>
      <gridHelper args={[xSpan + 2.6, 20, '#2a3b66', '#1c2b50']} position={[0, 0, 0]} />

      {series.map((item) => (
        <group key={item.key}>
          <Line points={linePoints[item.key]} color={item.color} lineWidth={2.4} />
          {linePoints[item.key].map((position, index) => {
            const row = data[index];
            const value = row[item.key];
            const active = hovered?.index === index && hovered.key === item.key;
            return (
              <mesh
                key={`${item.key}-${row.date}`}
                position={position}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  setHovered({ index, key: item.key });
                }}
                onPointerOut={(event) => {
                  event.stopPropagation();
                  setHovered(null);
                }}
              >
                <sphereGeometry args={[active ? 0.1 : 0.07, 18, 18]} />
                <meshStandardMaterial
                  color={item.color}
                  emissive={item.color}
                  emissiveIntensity={active ? 0.2 : 0.08}
                  metalness={0.25}
                  roughness={0.42}
                />
                {active ? (
                  <Html center distanceFactor={9}>
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'rgba(7, 12, 27, 0.92)',
                        border: `1px solid ${item.color}`,
                        color: '#e2e8f0',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
                      }}
                    >
                      <strong style={{ color: item.color }}>{item.label}</strong> - {formatQty(value)}
                    </div>
                  </Html>
                ) : null}
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

export default function StockMovement3D({ data }: StockMovement3DProps) {
  const [hovered, setHovered] = useState<HoveredPoint | null>(null);
  const activeRow = hovered ? data[hovered.index] : null;
  const activeSeries = hovered ? series.find((item) => item.key === hovered.key) : null;

  return (
    <div style={{ position: 'relative', height: 300, borderRadius: 14, overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 3.2, 8.1], fov: 48 }}>
        <StockMovementScene data={data} hovered={hovered} setHovered={setHovered} />
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
              Focus: <span style={{ color: activeSeries.color }}>{activeSeries.label}</span> {formatQty(activeRow[activeSeries.key])}
            </div>
            <div>
              R: {formatQty(activeRow.received)} | D: {formatQty(activeRow.delivered)} | T: {formatQty(activeRow.transferred)} | A: {formatQty(activeRow.adjusted)}
            </div>
          </>
        ) : (
          <div>Hover data points to inspect daily movement values in 3D.</div>
        )}
      </div>
    </div>
  );
}
