export const metadata = {
  title: "C.O.R.E. Prospect Audit — Stoke Foundry",
  description: "Patient acquisition prospect readiness audit tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0A0A0A" }}>
        {children}
      </body>
    </html>
  );
}
