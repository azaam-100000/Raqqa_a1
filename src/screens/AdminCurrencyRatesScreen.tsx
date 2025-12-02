import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { getErrorMessage } from '../utils/errors';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;

interface RateData {
    city_name: string;
    usd_buy: number;
    usd_sell: number;
    try_buy: number;
    try_sell: number;
}
type RatesState = Record<string, RateData>;

// Default structure to use when the database table is empty
const defaultCities: RatesState = {
    'Raqqa': { city_name: 'الرقة', usd_buy: 0, usd_sell: 0, try_buy: 0, try_sell: 0 },
    'Damascus': { city_name: 'دمشق', usd_buy: 0, usd_sell: 0, try_buy: 0, try_sell: 0 },
    'Aleppo': { city_name: 'حلب', usd_buy: 0, usd_sell: 0, try_buy: 0, try_sell: 0 },
    'Idlib': { city_name: 'إدلب', usd_buy: 0, usd_sell: 0, try_buy: 0, try_sell: 0 },
    'Hasakah': { city_name: 'الحسكة', usd_buy: 0, usd_sell: 0, try_buy: 0, try_sell: 0 },
};

const AdminCurrencyRatesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [rates, setRates] = useState<RatesState>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchRates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase.from('currency_rates').select('*');
            if (fetchError) throw fetchError;
            
            if (data && data.length > 0) {
                const formattedRates = data.reduce((acc, city) => {
                    acc[city.city_key] = {
                        city_name: city.city_name,
                        usd_buy: city.usd_buy,
                        usd_sell: city.usd_sell,
                        try_buy: city.try_buy,
                        try_sell: city.try_sell,
                    };
                    return acc;
                }, {} as RatesState);
                setRates(formattedRates);
            } else {
                // Use default cities if DB is empty so admin can populate them
                setRates(defaultCities);
            }

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    const handleInputChange = (cityKey: string, field: keyof Omit<RateData, 'city_name'>, value: string) => {
        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue) && value !== '') return;

        setRates(prev => ({
            ...prev,
            [cityKey]: {
                ...prev[cityKey],
                [field]: isNaN(numericValue) ? 0 : numericValue,
            },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const upsertData = Object.entries(rates).map(([city_key, rateData]: [string, RateData]) => ({
                city_key,
                ...rateData,
            }));
            
            const { error: upsertError } = await supabase.from('currency_rates').upsert(upsertData);
            if (upsertError) throw upsertError;

            setSuccess('تم حفظ الأسعار بنجاح!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full px-12">إدارة أسعار العملات</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                             <h2 className="text-xl font-bold text-cyan-400">الأسعار المحلية</h2>
                             <Button onClick={handleSave} loading={saving} disabled={loading} className="!w-auto px-6">
                                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                            </Button>
                        </div>
                        {success && <p className="text-green-400 mt-2 text-sm">{success}</p>}
                        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-10"><Spinner /></div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(rates).map(([cityKey, cityData]: [string, RateData]) => (
                                <div key={cityKey} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                                    <h3 className="font-bold text-lg mb-4">{cityData.city_name}</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-slate-400 mb-2">الدولار الأمريكي (USD)</p>
                                            <div className="flex gap-4">
                                                <LabeledInput label="شراء" type="number" value={cityData.usd_buy} onChange={e => handleInputChange(cityKey, 'usd_buy', e.target.value)} />
                                                <LabeledInput label="مبيع" type="number" value={cityData.usd_sell} onChange={e => handleInputChange(cityKey, 'usd_sell', e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-2">الليرة التركية (TRY)</p>
                                            <div className="flex gap-4">
                                                <LabeledInput label="شراء" type="number" value={cityData.try_buy} onChange={e => handleInputChange(cityKey, 'try_buy', e.target.value)} />
                                                <LabeledInput label="مبيع" type="number" value={cityData.try_sell} onChange={e => handleInputChange(cityKey, 'try_sell', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const LabeledInput: React.FC<React.ComponentProps<typeof Input> & { label: string }> = ({ label, ...props }) => (
    <div className="flex-1">
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <Input {...props} className="!py-2" />
    </div>
);

export default AdminCurrencyRatesScreen;