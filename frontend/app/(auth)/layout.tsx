export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page-bg min-h-screen flex items-center justify-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
