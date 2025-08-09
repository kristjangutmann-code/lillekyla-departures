
export const metadata = {
  title: "Lilleküla ↔ Klooga/Kloogaranna departures",
  description: "Shows today's remaining trains for Elron (R11/R12/R14/R15) westbound branch.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
