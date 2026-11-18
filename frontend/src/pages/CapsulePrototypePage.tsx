export default function CapsulePrototypePage() {
  return (
    <main className="h-screen w-full bg-slate-950">
      <a href="/" className="fixed bottom-3 left-3 z-50 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg">
        Voltar à plataforma
      </a>
      <iframe
        title="Protótipo conceitual 3D da cápsula InSightBot"
        src={`${import.meta.env.BASE_URL}capsula-3d/index.html`}
        className="h-full w-full border-0"
        allowFullScreen
      />
    </main>
  );
}
