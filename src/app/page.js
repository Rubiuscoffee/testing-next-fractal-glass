import FractalGlass from "@/components/FractalGlass/FractalGlass";

export default function Home() {
  return (
    <>
      <nav>
        <div className="logo">
          <a href="#">&#8486; Glassform</a>
        </div>

        <div className="nav-links">
          <a href="#">Experiments</a>
          <a href="#">Objects</a>
          <a href="#">Exhibits</a>
        </div>
      </nav>

      <section className="hero">
        <FractalGlass
          imgSrc="/hero.jpg"
          lerpFactor={0.035}
          parallaxStrength={0.1}
          distortionMultiplier={10}
          glassStrength={2.0}
          glassSmoothness={0.0001}
          stripesFrequency={35}
          edgePadding={0.1}
        />

        <div className="hero-content">
          <h1>Designed for the space between silence and noise.</h1>
          <p>Developed by Codegrid</p>
        </div>
      </section>
    </>
  );
}
