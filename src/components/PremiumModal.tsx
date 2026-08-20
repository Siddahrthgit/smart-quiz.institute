import React, { useState } from 'react';
import { X, Sparkles, Check, CreditCard } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<'esewa' | 'khalti' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async (gateway: 'esewa' | 'khalti') => {
    setError(null);
    setLoading(gateway);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Please log in first to upgrade.');
        setLoading(null);
        return;
      }

      const res = await fetch(`/api/payment/${gateway}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start payment');
        setLoading(null);
        return;
      }

      if (gateway === 'esewa') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.formUrl;
        Object.entries(data.fields).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        window.location.href = data.paymentUrl;
      }
    } catch {
      setError('Could not reach the server. Please try again.');
      setLoading(null);
    }
  };

  const price = plan === 'monthly' ? 299 : 2999;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Upgrade to Premium</h2>
          </div>
          <p className="text-xs text-slate-400">Unlock unlimited AI generation, friends & progress comparison.</p>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited AI quiz generation</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Friends & progress comparison</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Advanced analytics</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Priority AI tutor responses</li>
        </ul>

        <div className="flex bg-slate-800 rounded-xl p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setPlan('monthly')}
            className={`flex-1 py-2 rounded-lg transition-colors ${plan === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Monthly — Rs 299
          </button>
          <button
            type="button"
            onClick={() => setPlan('annual')}
            className={`flex-1 py-2 rounded-lg transition-colors ${plan === 'annual' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Annual — Rs 2999
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => handlePay('esewa')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors shadow"
          >
            <CreditCard className="w-4 h-4" />
            {loading === 'esewa' ? 'Redirecting...' : `Pay Rs ${price} with eSewa`}
          </button>
          <button
            onClick={() => handlePay('khalti')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors shadow"
          >
            <CreditCard className="w-4 h-4" />
            {loading === 'khalti' ? 'Redirecting...' : `Pay Rs ${price} with Khalti`}
          </button>
        </div>
      </div>
    </div>
  );
};
