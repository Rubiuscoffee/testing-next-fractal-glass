"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./Shaders";

type FractalGlassProps = {
  imgSrc: string;
  lerpFactor?: number;
  parallaxStrength?: number;
  parallaxEnabled?: boolean;
  distortionMultiplier?: number;
  glassStrength?: number;
  glassSmoothness?: number;
  stripesFrequency?: number;
  edgePadding?: number;
  className?: string;
};

const FractalGlass: React.FC<FractalGlassProps> = ({
  imgSrc,
  lerpFactor = 0.035,
  parallaxStrength = 0.1,
  parallaxEnabled = true,
  distortionMultiplier = 10,
  glassStrength = 2.0,
  glassSmoothness = 0.0001,
  stripesFrequency = 35,
  edgePadding = 0.1,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const textureRef = useRef<THREE.Texture | null>(null);
  const [inView, setInView] = useState(true);
  const containerSizeRef = useRef({ width: 0, height: 0 });
  const [textureError, setTextureError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglAvailable(!!ctx);
    } catch {
      setWebglAvailable(false);
    }

    if (!webglAvailable) return;

    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(rendererRef.current.domElement);

    const textureSize = { x: 1, y: 1 };

    materialRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTextureSize: { value: new THREE.Vector2(textureSize.x, textureSize.y) },
        uMouse: { value: new THREE.Vector2(mouseRef.current.x, mouseRef.current.y) },
        uParallaxStrength: { value: parallaxEnabled ? parallaxStrength : 0 },
        uDistortionMultiplier: { value: distortionMultiplier },
        uGlassStrength: { value: glassStrength },
        ustripesFrequency: { value: stripesFrequency },
        uglassSmoothness: { value: glassSmoothness },
        uEdgePadding: { value: edgePadding },
      },
      vertexShader,
      fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    meshRef.current = new THREE.Mesh(geometry, materialRef.current);
    sceneRef.current.add(meshRef.current);

    const rect = containerRef.current.getBoundingClientRect();
    if (rendererRef.current) rendererRef.current.setSize(rect.width, rect.height);
    if (materialRef.current) materialRef.current.uniforms.uResolution.value.set(rect.width, rect.height);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        containerSizeRef.current = { width: cr.width, height: cr.height };
        if (rendererRef.current) rendererRef.current.setSize(cr.width, cr.height);
        if (materialRef.current) materialRef.current.uniforms.uResolution.value.set(cr.width, cr.height);
      }
    });
    ro.observe(containerRef.current);

    const io = new IntersectionObserver((entries) => {
      setInView(entries[0]?.isIntersecting ?? true);
    }, { threshold: 0.01 });
    io.observe(containerRef.current);

    animate();

    return () => {
      io.disconnect();
      ro.disconnect();

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        meshRef.current.material.dispose();
      }

      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [webglAvailable]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (parallaxEnabled) {
      el.addEventListener("pointermove", handlePointerMove);
      el.addEventListener("pointerleave", handlePointerLeave);
      return () => {
        el.removeEventListener("pointermove", handlePointerMove);
        el.removeEventListener("pointerleave", handlePointerLeave);
      };
    } else {
      targetMouseRef.current.x = 0.5;
      targetMouseRef.current.y = 0.5;
    }
  }, [parallaxEnabled]);

  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !materialRef.current) return;
    if (inView) {
      if (!animationRef.current) animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [inView]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uParallaxStrength.value = parallaxEnabled ? parallaxStrength : 0;
    materialRef.current.uniforms.uDistortionMultiplier.value = distortionMultiplier;
    materialRef.current.uniforms.uGlassStrength.value = glassStrength;
    materialRef.current.uniforms.ustripesFrequency.value = stripesFrequency;
    materialRef.current.uniforms.uglassSmoothness.value = glassSmoothness;
    materialRef.current.uniforms.uEdgePadding.value = edgePadding;
    if (!parallaxEnabled) {
      materialRef.current.uniforms.uMouse.value.set(0.5, 0.5);
    }
  }, [parallaxEnabled, parallaxStrength, distortionMultiplier, glassStrength, stripesFrequency, glassSmoothness, edgePadding]);

  useEffect(() => {
    if (!materialRef.current || !webglAvailable) return;
    setTextureError(false);
    loadTexture();
  }, [imgSrc, webglAvailable]);

  const loadTexture = () => {
    if (!materialRef.current || !webglAvailable) return;
    const loader = new THREE.TextureLoader();
    (loader as THREE.Loader).crossOrigin = "anonymous";
    loader.load(
      imgSrc,
      (texture: THREE.Texture) => {
        if (textureRef.current) textureRef.current.dispose();
        textureRef.current = texture;
        texture.needsUpdate = true;
        const img = texture.image as { width: number; height: number } & Partial<{ naturalWidth: number; naturalHeight: number }>;
        const width = typeof img.naturalWidth === "number" ? img.naturalWidth : img.width;
        const height = typeof img.naturalHeight === "number" ? img.naturalHeight : img.height;
        materialRef.current!.uniforms.uTexture.value = texture;
        materialRef.current!.uniforms.uTextureSize.value.set(width, height);
        setIsLoaded(true);
      },
      undefined,
      () => {
        setTextureError(true);
      }
    );
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    targetMouseRef.current.x = Math.max(0, Math.min(1, x));
    targetMouseRef.current.y = Math.max(0, Math.min(1, y));
  };

  const handlePointerLeave = () => {
    targetMouseRef.current.x = 0.5;
    targetMouseRef.current.y = 0.5;
  };

  const handleResize = () => {};

  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !materialRef.current) return;
    if (!inView) return;
    animationRef.current = requestAnimationFrame(animate);
    if (parallaxEnabled) {
      mouseRef.current.x = lerp(mouseRef.current.x, targetMouseRef.current.x, lerpFactor);
      mouseRef.current.y = lerp(mouseRef.current.y, targetMouseRef.current.y, lerpFactor);
    } else {
      mouseRef.current.x = 0.5;
      mouseRef.current.y = 0.5;
    }
    materialRef.current.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  if (!webglAvailable || textureError) {
    return <img src={imgSrc} alt="" className={className} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }

  return (
    <div ref={containerRef} className={className ?? "fractal-glass-container"} style={{ width: "100%", height: "100%", position: "relative" }} />
  );
};

export default FractalGlass;
