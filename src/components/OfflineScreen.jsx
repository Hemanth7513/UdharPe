import { useState, useEffect } from 'react';
import { WifiOff, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from './BrandMark';

/**
 * Displays a clean offline recovery screen whenever the browser loses
 * Wi-Fi or mobile data mid-session, and auto-resumes when reconnected.
 */
export default function OfflineScreen() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const res = await fetch('/manifest.webmanifest', { cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        toast.success('Connection restored');
      }
    } catch {
      toast.error('Still offline. Please check your Wi-Fi or mobile data.');
    } finally {
      setChecking(false);
    }
  };

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#f4f4f5] text-zinc-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-zinc-300 rounded-lg p-8 text-center space-y-5 shadow-elevated">
        <div className="flex justify-center">
          <BrandMark size={44} />
        </div>

        <div className="w-14 h-14 mx-auto rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
          <WifiOff size={26} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-zinc-900 tracking-tight">
            You&apos;re Offline
          </h1>
          <p className="text-[14px] text-zinc-600 leading-relaxed">
            No Wi-Fi or mobile data connection detected. UdharPe requires an active connection to keep your ledger synced safely.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className="btn-primary w-full py-3 text-[14px]"
        >
          <RotateCw size={16} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking connection...' : 'Retry Connection'}
        </button>
      </div>
    </div>
  );
}
