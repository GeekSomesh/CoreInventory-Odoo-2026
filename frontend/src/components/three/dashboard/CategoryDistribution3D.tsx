import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { DashboardCategorySummary } from '../../../types/api';
import { formatQty } from '../../../utils/format';

interface CategoryDistribution3DProps {
  data: DashboardCategorySummary[];
}

interface HoveredBar {
  index: number;
}

const palette = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6'];

function CategoryBarsScene({
  categories,
  hovered,
  setHovered,
}: {
  categories: DashboardCategorySummary[];
  hovered: HoveredBar | null;
  setHovered: (value: HoveredBar | null) => void;
}) {
  const maxStock = useMemo(() => Math.max(1, ...categories.map((item) => item.total_stock)), [categories]);
  const xStep = 0.95;
  const xStart = -(Math.max(1, categories.length - 1) * xStep) / 2;
  const floorWidth = Math.max(7, categories.length * xStep + 2);

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight intensity={0.78} color="#dbeafe" position={[5, 8, 6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[floorWidth, 4.8]} />
        <meshStandardMaterial color="#0a1429" roughness={0.95} metalness={0.08} />
      </mesh>
      <gridHelper args={[floorWidth, 20, '#2a3b66', '#1c2b50']} position={[0, 0, 0]} />

      {categories.map((item, index) => {
        const color = palette[index % palette.length];
        const active = hovered?.index === index;
        const height = Math.max(0.2, (item.total_stock / maxStock) * 3.2);
        const x = xStart + index * xStep;
        return (
          <mesh
            key={item.id}
            position={[x, height / 2, 0]}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered({ index });
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHovered(null);
            }}
          >
            <boxGeometry args={[0.45, active ? height + 0.06 : height, 0.45]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={active ? 0.22 : 0.08}
              metalness={0.25}
              roughness={0.42}
            />
            {active ? (
              <Html center distanceFactor={8}>
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: 'rgba(7, 12, 27, 0.94)',
                    border: `1px solid ${color}`,
                    color: '#e2e8f0',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div style={{ color, fontWeight: 700 }}>{item.name}</div>
                  <div>Stock: {formatQty(item.total_stock)}</div>
                  <div>Products: {formatQty(item.product_count)}</div>
                </div>
              </Html>
            ) : null}
          </mesh>
        );
      })}
    </>
  );
}

export default function CategoryDistribution3D({ data }: CategoryDistribution3DProps) {
  const [hovered, setHovered] = useState<HoveredBar | null>(null);
  const categories = useMemo(
    () => [...data].sort((a, b) => b.total_stock - a.total_stock).slice(0, 7),
    [data],
  );
  const totalStock = useMemo(
    () => categories.reduce((sum, item) => sum + item.total_stock, 0),
    [categories],
  );
  const active = hovered ? categories[hovered.index] : null;

  return (
    <div style={{ position: 'relative', height: 300, borderRadius: 14, overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 3.2, 7.2], fov: 48 }}>
        <CategoryBarsScene categories={categories} hovered={hovered} setHovered={setHovered} />
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
          maxWidth: 240,
        }}
      >
        {active ? (
          <>
            <div style={{ color: 'var(--txt-primary)', fontWeight: 600 }}>{active.name}</div>
            <div>Stock: {formatQty(active.total_stock)}</div>
            <div>Products: {formatQty(active.product_count)}</div>
          </>
        ) : (
          <div>
            Showing top categories by stock. Total indexed: {formatQty(totalStock)}. Hover bars for exact values.
          </div>
        )}
      </div>
    </div>
  );
}

