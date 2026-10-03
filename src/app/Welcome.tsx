export function Welcome({ onChooseFolder }: { onChooseFolder: () => void }) {
  return (
    <main className="welcome">
      <span className="brand-mark large" aria-hidden="true">
        P
      </span>
      <h1>Penna</h1>
      <p>Din text sparas som vanliga filer i en mapp du väljer. Ingen server, inget konto.</p>
      <button className="button primary" onClick={onChooseFolder}>
        Välj projektmapp
      </button>
    </main>
  );
}
