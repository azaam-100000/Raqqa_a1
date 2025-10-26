

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import GuestLock from '../components/GuestLock';

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

const currencyInfo: { [key: string]: { name: string; icon: string; bgColor: string } } = {
    USD: { name: 'دولار أمريكي', icon: '🇺🇸', bgColor: 'bg-green-500' },
    EUR: { name: 'يورو', icon: '🇪🇺', bgColor: 'bg-blue-500' },
    TRY: { name: 'ليرة تركية', icon: '🇹🇷', bgColor: 'bg-red-500' },
    AED: { name: 'درهم إماراتي', icon: '🇦🇪', bgColor: 'bg-gray-500' },
    SAR: { name: 'ريال سعودي', icon: '🇸🇦', bgColor: 'bg-green-600' },
    CAD: { name: 'دولار كندي', icon: '🇨🇦', bgColor: 'bg-red-600' },
    JPY: { name: 'ين ياباني', icon: '🇯🇵', bgColor: 'bg-red-400' },
    GBP: { name: 'جنيه استرليني', icon: '🇬🇧', bgColor: 'bg-blue-600' },
    AUD: { name: 'دولار أسترالي', icon: '🇦🇺', bgColor: 'bg-blue-700' },
    SYP: { name: 'ليرة سورية', icon: '🇸🇾', bgColor: 'bg-gray-400' },
};

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const ShareIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> );

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-bold transition-colors ${
            active
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-500 dark:text-zinc-400 border-b-2 border-transparent hover:text-teal-400/70'
        }`}
    >
        {children}
    </button>
);

const CurrencyScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');
    const { user, isGuestFromShare } = useAuth();
    const isGuest = isGuestFromShare && !user;
    const location = useLocation();

    const [frankfurterRates, setFrankfurterRates] = useState<FrankfurterResponse | null>(null);
    const [baseCurrency, setBaseCurrency] = useState('USD');
    const [frankfurterLoading, setFrankfurterLoading] = useState(true);
    const [frankfurterError, setFrankfurterError] = useState<string | null>(null);
    
    const [localRates, setLocalRates] = useState<LocalMarketRates | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [localLoading, setLocalLoading] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);
    
    const [selectedCity, setSelectedCity] = useState<string>('Raqqa');
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
        if (activeTab === 'global') {
            fetchFrankfurterRates();
        }
    }, [baseCurrency, activeTab]);

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
    
    useEffect(() => {
        const hashParams = new URLSearchParams(location.hash.split('?')[1]);
        const sharedCity = hashParams.get('city');
        if (isGuest && sharedCity && localRates && localRates[sharedCity]) {
            setSelectedCity(sharedCity);
        }
    }, [isGuest, location, localRates]);


    const targetCurrencies = useMemo(() => {
        return Object.keys(currencyInfo).filter(c => c !== baseCurrency && c !== 'SYP');
    }, [baseCurrency]);

    const currentCityRates = localRates ? localRates[selectedCity] : null;

    const handleShare = () => {
        if (!currentCityRates || !localRates) return;

        const cityName = localRates[selectedCity]?.name || '';
        const date = lastUpdated ? new Date(lastUpdated) : new Date();
        const formattedDate = date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const shareText = `
══════ ❁ ══════
  *أسعار العملات والذهب*
      *في سوريا* 🇸🇾
══════ ❁ ══════

🏙️ *المحافظة:* ${cityName}
📅 *التاريخ:* ${formattedDate}
⏰ *الوقت:* ${formattedTime}

-----------------------------------

*🇺🇸 دولار أمريكي (USD)*
شراء: *${currentCityRates.USD_SYP.buy.toLocaleString()}* ل.س
مبيع: *${currentCityRates.USD_SYP.sell.toLocaleString()}* ل.س

*🇹🇷 ليرة تركية (TRY)*
شراء: *${currentCityRates.TRY_SYP.buy.toLocaleString()}* ل.س
مبيع: *${currentCityRates.TRY_SYP.sell.toLocaleString()}* ل.س

-----------------------------------

📲 *تطبيق سوق محافظة الرقة*
 اضغط على الرابط لمتابعة آخر الأسعار لجميع المحافظات، وتصفح أكبر سوق لكل شي جديد ومستعمل في الرقة!
        `.trim();

        const shareUrl = `${window.location.origin}${window.location.pathname}#/rates?city=${selectedCity}`;

        if (navigator.share) {
            navigator.share({
                title: `أسعار العملات في ${cityName}`,
                text: `${shareText}\n${shareUrl}`,
            }).catch(error => console.error('Error sharing:', error));
        } else {
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            alert('تم نسخ الأسعار والرابط إلى الحافظة.');
        }
    };


    const renderLocalMarketSection = () => {
        if (localLoading) return <div className="text-center py-20"><Spinner /></div>;
        if (localError) return <div className="p-4 bg-red-500/10 text-red-400 rounded-lg text-center">{localError}</div>;
        if (!localRates || !currentCityRates) return null;

        return (
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="col-span-1">
                        <GuestLock>
                            <label className="block text-sm text-gray-500 dark:text-zinc-400 mb-2">اختر المدينة:</label>
                            <Select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} disabled={isGuest}>
                                {Object.keys(localRates).map(cityKey => (
                                    <option key={cityKey} value={cityKey}>{localRates[cityKey].name}</option>
                                ))}
                            </Select>
                        </GuestLock>
                    </div>
                    <button onClick={handleShare} className="flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50 h-fit" disabled={!currentCityRates} aria-label="مشاركة الأسعار">
                        <ShareIcon />
                        <span>مشاركة</span>
                    </button>
                </div>
                 {lastUpdated && (
                    <p className="text-xs text-gray-500 dark:text-zinc-500 text-center">
                        آخر تحديث: {new Date(lastUpdated).toLocaleString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
                
                {/* USD Card */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${currencyInfo.USD.bgColor}`}>{currencyInfo.USD.icon}</span>
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${currencyInfo.SYP.bgColor}`}>{currencyInfo.SYP.icon}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">دولار أمريكي / ليرة سورية</h4>
                    </div>
                    <div className="flex justify-around text-center">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">شراء</p>
                            <p className="font-mono text-lg font-bold text-green-500">{currentCityRates.USD_SYP.buy.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">مبيع</p>
                            <p className="font-mono text-lg font-bold text-red-500">{currentCityRates.USD_SYP.sell.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                 {/* TRY Card */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${currencyInfo.TRY.bgColor}`}>{currencyInfo.TRY.icon}</span>
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${currencyInfo.SYP.bgColor}`}>{currencyInfo.SYP.icon}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">ليرة تركية / ليرة سورية</h4>
                    </div>
                     <div className="flex justify-around text-center">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">شراء</p>
                            <p className="font-mono text-lg font-bold text-green-500">{currentCityRates.TRY_SYP.buy.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">مبيع</p>
                            <p className="font-mono text-lg font-bold text-red-500">{currentCityRates.TRY_SYP.sell.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderInternationalSection = () => {
        if (frankfurterLoading) return <div className="text-center py-20"><Spinner /></div>;
        if (frankfurterError) return <div className="p-4 bg-red-500/10 text-red-400 rounded-lg text-center">{frankfurterError}</div>;
        
        return (
            <div className="space-y-4">
                <div className="mb-4">
                    <label className="block text-sm text-gray-500 dark:text-zinc-400 mb-2">العملة الأساسية:</label>
                    <Select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)}>
                        {Object.keys(currencyInfo).filter(c => c !== 'SYP').map(code => (
                            <option key={code} value={code}>{currencyInfo[code].name} ({code})</option>
                        ))}
                    </Select>
                </div>
                 {frankfurterRates && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 text-center">
                        آخر تحديث: {new Date(frankfurterRates.date).toLocaleDateString('ar-EG')}
                    </p>
                )}
                <div className="space-y-2">
                    {frankfurterRates && targetCurrencies.map(currency => (
                        frankfurterRates.rates[currency] && (
                            <div key={currency} className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                   <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${currencyInfo[currency]?.bgColor || 'bg-gray-400'}`}>{currencyInfo[currency]?.icon}</span>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{currencyInfo[currency]?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">{baseCurrency} / {currency}</p>
                                    </div>
                                </div>
                                <p className="font-mono text-lg font-semibold">{frankfurterRates.rates[currency]?.toFixed(4)}</p>
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
                    <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex mb-6">
                        <TabButton active={activeTab === 'local'} onClick={() => setActiveTab('local')}>السوق المحلي</TabButton>
                        <GuestLock>
                            <div className="flex-1">
                                <TabButton active={activeTab === 'global'} onClick={() => setActiveTab('global')}>أسعار عالمية</TabButton>
                            </div>
                        </GuestLock>
                    </div>
                    
                    {activeTab === 'local' && renderLocalMarketSection()}
                    
                    {activeTab === 'global' && (
                        <GuestLock>
                            {renderInternationalSection()}
                        </GuestLock>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CurrencyScreen;