import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function pseudo(seed: number): number {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function FloatingBoxes() {
    const groupRef = useRef<THREE.Group | null>(null);
    const count = 40;
    const boxes = useMemo<Array<{ pos: THREE.Vector3; rot: THREE.Euler; speed: number; scale: number; opacity: number }>>(
        () =>
            Array.from({ length: count }, (_, index) => {
                const r1 = pseudo(index + 1);
                const r2 = pseudo(index + 11);
                const r3 = pseudo(index + 21);
                const r4 = pseudo(index + 31);
                const r5 = pseudo(index + 41);
                const r6 = pseudo(index + 51);
                const r7 = pseudo(index + 61);
                const r8 = pseudo(index + 71);
                return {
                    pos: new THREE.Vector3((r1 - 0.5) * 20, (r2 - 0.5) * 12, (r3 - 0.5) * 10 - 5),
                    rot: new THREE.Euler(r4 * Math.PI, r5 * Math.PI, r6 * Math.PI),
                    speed: 0.003 + r7 * 0.005,
                    scale: 0.15 + r8 * 0.35,
                    opacity: 0.12 + pseudo(index + 91) * 0.08,
                };
            }),
        [count],
    );

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.children.forEach((child, i) => {
            const box = boxes[i];
            child.rotation.x += box.speed;
            child.rotation.y += box.speed * 0.7;
            child.position.y += Math.sin(state.clock.elapsedTime * box.speed * 10 + i) * 0.003;
        });
    });

    return (
        <group ref={groupRef}>
            {boxes.map((box, i) => (
                <mesh key={i} position={box.pos} rotation={box.rot} scale={box.scale}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial
                        color={i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#06b6d4' : '#8b5cf6'}
                        transparent opacity={box.opacity}
                        wireframe={i % 2 === 0}
                    />
                </mesh>
            ))}
        </group>
    );
}

export default function ParticleWarehouse() {
    return (
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} style={{ position: 'absolute', inset: 0 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[5, 5, 5]} intensity={1} color="#6366f1" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#06b6d4" />
            <FloatingBoxes />
        </Canvas>
    );
}
