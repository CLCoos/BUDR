/**
 * Tidligere login-indgang (/app/<borger-id>). Borgerens id giver ikke længere adgang;
 * personalet udsteder i stedet et engangs-login-link fra borgerens 360°-side.
 */
export default function ResidentEntryPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Linket er udgået</h1>
      <p className="mt-2 text-sm text-slate-600">Bed personalet om et nyt login-link til Lys.</p>
    </main>
  );
}
