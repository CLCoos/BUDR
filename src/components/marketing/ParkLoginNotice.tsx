import Link from 'next/link';

export default function ParkLoginNotice() {
  return (
    <div
      className="border-b border-amber-200/80 bg-amber-50 text-center text-sm text-amber-950 py-3 px-4"
      role="status"
    >
      <p className="max-w-2xl mx-auto leading-relaxed">
        Lys og park kræver, at du er logget ind med dit personlige link fra bostedet. Kontakt
        personalet, hvis du er i tvivl.{' '}
        <Link href="/care-portal-login" className="font-medium underline underline-offset-2">
          Personale logger ind i Care Portal her
        </Link>
        .
      </p>
    </div>
  );
}
