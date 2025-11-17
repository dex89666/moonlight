// Temporarily disable TypeScript checking to reduce editor errors while
// the project dependency matrix (React 19 vs React 18 / r3f) is resolved.
// Remove this line after installing proper types or moving the file to the
// `apps/web-3d` workspace which targets React 18.
// @ts-nocheck
import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useCursor, Html } from '@react-three/drei'
import * as THREE from 'three'

function Crystal({ position = [0, 0, 0], color = '#8b5cf6' }: any) {
  const ref = useRef<THREE.Mesh>(null!)
  const hover = useRef(false)
  useCursor(hover.current)
  useFrame((state, dt) => {
    if (ref.current) ref.current.rotation.y += 0.2 * dt * (hover.current ? 3 : 1)
    ref.current.scale.lerp(new THREE.Vector3(hover.current ? 1.04 : 1, hover.current ? 1.04 : 1, hover.current ? 1.04 : 1), 0.06)
  })
  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={() => (hover.current = true)}
      onPointerOut={() => (hover.current = false)}
      castShadow
    >
      <octahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} emissive={color} emissiveIntensity={0.2} transparent opacity={0.95} />
    </mesh>
  )
}

function EyePlaceholder({ position = [0, 0, -6] }: any) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()
    ref.current.rotation.y = Math.sin(t * 0.4) * 0.08
  })
  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshStandardMaterial color={'#2a0a00'} emissive={'#ff7a2b'} emissiveIntensity={0.15} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 1.2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.6, 32]} />
        <meshStandardMaterial color={'#060000'} emissive={'#000000'} />
      </mesh>
    </group>
  )
}

export default function R3FScene() {
  return (
    <div style={{ width: '100%', height: '720px' }}>
      <Canvas shadows camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.18} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <spotLight position={[-10, 15, 10]} angle={0.3} penumbra={0.3} intensity={0.8} castShadow />

        <Crystal position={[-3, 1, -4]} color={'#6ee7b7'} />
        <Crystal position={[2.2, -0.8, -3]} color={'#8b5cf6'} />
        <Crystal position={[4, 2, -6]} color={'#fca5a5'} />

        <EyePlaceholder position={[0, -0.2, -6]} />

        <OrbitControls enablePan={false} enableZoom={false} enableRotate={true} />
      </Canvas>
    </div>
  )
}
