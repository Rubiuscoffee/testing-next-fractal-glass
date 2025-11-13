"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./Shaders.js";

const FractalGlass = ({
  imgSrc,
  lerpFactor = 0.035,
  parallaxStrength = 0.1,
  distortionMultiplier = 10,
  glassStrength = 2.0,
  glassSmoothness = 0.0001,
  stripesFrequency = 35,
  edgePadding = 0.1,
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(rendererRef.current.domElement);

    const textureSize = { x: 1, y: 1 };

    materialRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uTextureSize: {
          value: new THREE.Vector2(textureSize.x, textureSize.y),
        },
        uMouse: {
          value: new THREE.Vector2(mouseRef.current.x, mouseRef.current.y),
        },
        uParallaxStrength: { value: parallaxStrength },
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

    loadTexture();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        meshRef.current.material.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uParallaxStrength.value = parallaxStrength;
    materialRef.current.uniforms.uDistortionMultiplier.value =
      distortionMultiplier;
    materialRef.current.uniforms.uGlassStrength.value = glassStrength;
    materialRef.current.uniforms.ustripesFrequency.value = stripesFrequency;
    materialRef.current.uniforms.uglassSmoothness.value = glassSmoothness;
    materialRef.current.uniforms.uEdgePadding.value = edgePadding;
  }, [
    parallaxStrength,
    distortionMultiplier,
    glassStrength,
    stripesFrequency,
    glassSmoothness,
    edgePadding,
  ]);

  useEffect(() => {
    if (isLoaded) {
      loadTexture();
    }
  }, [imgSrc, isLoaded]);

  const loadTexture = () => {
    if (!materialRef.current) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      imgSrc,
      (texture) => {
        texture.needsUpdate = true;
        const img = texture.image;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        materialRef.current.uniforms.uTexture.value = texture;
        materialRef.current.uniforms.uTextureSize.value.set(width, height);
        setIsLoaded(true);
      },
      undefined,
      (error) => {
        console.error("Error loading texture:", error);
      }
    );
  };

  const handleMouseMove = (e) => {
    targetMouseRef.current.x = e.clientX / window.innerWidth;
    targetMouseRef.current.y = 1.0 - e.clientY / window.innerHeight;
  };

  const handleResize = () => {
    if (!rendererRef.current || !materialRef.current) return;

    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    materialRef.current.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  };

  const lerp = (start, end, factor) => start + (end - start) * factor;

  const animate = () => {
    if (
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current ||
      !materialRef.current
    )
      return;

    animationRef.current = requestAnimationFrame(animate);

    mouseRef.current.x = lerp(
      mouseRef.current.x,
      targetMouseRef.current.x,
      lerpFactor
    );
    mouseRef.current.y = lerp(
      mouseRef.current.y,
      targetMouseRef.current.y,
      lerpFactor
    );
    materialRef.current.uniforms.uMouse.value.set(
      mouseRef.current.x,
      mouseRef.current.y
    );

    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  return (
    <div
      ref={containerRef}
      className="fractal-glass-container"
      style={{ width: "100%", height: "100%", position: "absolute" }}
    >
      <img src={imgSrc} alt="" style={{ display: "none" }} />
    </div>
  );
};

export default FractalGlass;
