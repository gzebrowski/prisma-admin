

export function LoadingSpinner() {
  return (
    <div className="admin-fixed admin-inset-0 admin-flex admin-items-center admin-justify-center admin-z-50" style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)' }}>
      <div className="loader admin-rounded-full admin-h-16 admin-w-16" style={{ border: '8px solid #e5e7eb', borderTop: '8px solid #3b82f6' }}></div>
    </div>
  );
}
