import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';
import { supabase } from '../services/supabase';

interface Rates {
    [key: string]: number;
}

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Rates;
}

interface LocalMarketRates {
    [key: string]: {
        name: string;
        USD_SYP: { buy: number; sell: number };
        TRY_SYP: { buy: number; sell: number };
    };
}

const currencyNames: { [key: string]: string } = {
    USD: 'دولار أمريكي',
    EUR: 'يورو',
    TRY: 'ليرة تركية',
    AED: 'درهم إماراتي',
    SAR: 'ريال سعودي',
    CAD: 'دولار كندي',
    JPY: 'ين ياباني',
    GBP: 'جنيه استرليني',
    AUD: 'دولار أسترالي',
};

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );

const CurrencyScreen: React.FC = () => {
    const [frankfurterRates, setFrankfurterRates] = useState<FrankfurterResponse | null>(null);
    const [baseCurrency, setBaseCurrency] = useState('USD');
    const [frankfurterLoading, setFrankfurterLoading] = useState(true);
    const [frankfurterError, setFrankfurterError] = useState<string | null>(null);
    
    const [localRates, setLocalRates] = useState<LocalMarketRates | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [localLoading, setLocalLoading] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);
    
    const [selectedCity, setSelectedCity] = useState<string>('Damascus');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFrankfurterRates = async () => {
            setFrankfurterLoading(true);
            setFrankfurterError(null);
            try {
                const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
                if (!response.ok) throw new Error('فشلت الشبكة في الاستجابة.');
                const data: FrankfurterResponse = await response.json();
                setFrankfurterRates(data);
            } catch (err: any) {
                setFrankfurterError('لا يمكن تحميل الأسعار العالمية.');
            } finally {
                setFrankfurterLoading(false);
            }
        };
        fetchFrankfurterRates();
    }, [baseCurrency]);

    useEffect(() => {
        const fetchLocalRates = async () => {
            setLocalLoading(true);
            setLocalError(null);
            try {
                const { data, error } = await supabase.from('currency_rates').select('*');
                if (error) throw error;
                if (!data || data.length === 0) throw new Error("لم يتم العثور على بيانات أسعار العملات المحلية.");

                const formattedRates = data.reduce((acc, city) => {
                    acc[city.city_key] = {
                        name: city.city_name,
                        'USD_SYP': { buy: city.usd_buy, sell: city.usd_sell },
                        'TRY_SYP': { buy: city.try_buy, sell: city.try_sell },
                    };
                    return acc;
                }, {} as LocalMarketRates);

                const latestUpdate = data.reduce((latest, city) => {
                    const cityDate = new Date(city.updated_at);
                    return cityDate > latest ? cityDate : latest;
                }, new Date(0));

                setLocalRates(formattedRates);
                setLastUpdated(latestUpdate.toISOString());
            } catch (err: any) {
                setLocalError('فشل تحميل أسعار السوق المحلية.');
                console.error("Local rates error:", err);
            } finally {
                setLocalLoading(false);
            }
        };
        fetchLocalRates();
    }, []);

    const targetCurrencies = useMemo(() => {
        return Object.keys(currencyNames).filter(c => c !== baseCurrency);
    }, [baseCurrency]);

    const currentCityRates = localRates ? localRates[selectedCity] : null;

    const renderLocalMarketSection = () => {
        if (localLoading) return <div className="text-center py-10"><Spinner /></div>;
        if (localError) return <p className="text-center text-red-400 py-10">{localError}</p>;
        if (!localRates || !currentCityRates) return null;

        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-3">أسعار السوق المحلية</h3>
                {lastUpdated && (
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mb-3 text-center">
                        آخر تحديث: {new Date(lastUpdated).toLocaleString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 dark:text-zinc-400 mb-2">اختر المدينة:</label>
                    <Select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                        {Object.keys(localRates).map(cityKey => (
                            <option key={cityKey} value={cityKey}>{localRates[cityKey].name}</option>
                        ))}
                    </Select>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center bg-gray-100 dark:bg-zinc-800/50 p-3 rounded-md">
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">دولار أمريكي / ليرة سورية</p>
                        </div>
                        <div className="text-left">
                            <p className="font-mono"><span className="text-xs text-gray-500 dark:text-zinc-400">شراء: </span>{currentCityRates.USD_SYP.buy.toLocaleString()}</p>
                            <p className="font-mono"><span className="text-xs text-gray-500 dark:text-zinc-400">مبيع: </span>{currentCityRates.USD_SYP.sell.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-100 dark:bg-zinc-800/50 p-3 rounded-md">
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">ليرة تركية / ليرة سورية</p>
                        </div>
                         <div className="text-left">
                            <p className="font-mono"><span className="text-xs text-gray-500 dark:text-zinc-400">شراء: </span>{currentCityRates.TRY_SYP.buy.toLocaleString()}</p>
                            <p className="font-mono"><span className="text-xs text-gray-500 dark:text-zinc-400">مبيع: </span>{currentCityRates.TRY_SYP.sell.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderInternationalSection = () => {
        if (frankfurterLoading) return <div className="text-center py-10"><Spinner /></div>;
        if (frankfurterError) return <p className="text-center text-red-400 py-10">{frankfurterError}</p>;
        
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-3">الأسعار العالمية</h3>
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 dark:text-zinc-400 mb-2">العملة الأساسية:</label>
                    <Select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)}>
                        {Object.keys(currencyNames).map(code => (
                            <option key={code} value={code}>{currencyNames[code]} ({code})</option>
                        ))}
                    </Select>
                </div>
                 {frankfurterRates && (
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4 text-center">
                        آخر تحديث: {new Date(frankfurterRates.date).toLocaleDateString('ar-EG')}
                    </p>
                )}
                <div className="space-y-2">
                    {frankfurterRates && targetCurrencies.map(currency => (
                        frankfurterRates.rates[currency] && (
                            <div key={currency} className="flex justify-between items-center bg-gray-100 dark:bg-zinc-800/50 p-3 rounded-md">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{currencyNames[currency]}</p>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400">{baseCurrency} / {currency}</p>
                                </div>
                                <p className="font-mono text-lg">{frankfurterRates.rates[currency]?.toFixed(4)}</p>
                            </div>
                        )
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">أسعار صرف العملات</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {renderLocalMarketSection()}
                    {renderInternationalSection()}
                </div>
            </main>
        </div>
    );
};

export default CurrencyScreen;
