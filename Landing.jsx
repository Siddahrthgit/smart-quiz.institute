function Landing() {
  return (
    <div className="landing-hero">
      <h1>Make Your Own Mock Test</h1>
      <p>Smart AI question practicing — any topic, any exam, instantly.</p>
      <button onClick={() => window.location.href = '/session'}>
        Get Started
      </button>
    </div>
  );
}

export default Landing;
