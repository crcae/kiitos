import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CreditCard, Smartphone, Zap, Clock, TrendingUp, Shield, Menu, X, ArrowRight, CheckCircle, SmartphoneNfc, Globe } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const handleDashboardNavigation = () => {
        if (!user) {
            router.push('/login');
            return;
        }

        switch (user.role) {
            case 'saas_admin':
            case 'restaurant_owner':
            case 'restaurant_manager':
                router.push('/admin');
                break;
            case 'waiter':
                router.push('/waiter');
                break;
            case 'cashier':
                router.push('/cashier');
                break;
            case 'kitchen':
                router.push('/kitchen');
                break;
            case 'customer':
            default:
                router.push('/(app)/marketplace');
                break;
        }
    };

    const LanguagePill = () => (
        <TouchableOpacity
            onPress={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
            className="flex-row items-center bg-white/90 border border-gray-200 px-3 py-1.5 rounded-full shadow-sm"
        >
            <Text className="mr-2 text-base">{i18n.language === 'es' ? '🇲🇽' : '🇺🇸'}</Text>
            <Text className="text-xs font-bold text-gray-700 uppercase">{i18n.language}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Navbar */}
            <View className="w-full px-4 py-4 sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <View
                    style={{ maxWidth: 1200 }}
                    className="mx-auto w-full flex-row items-center justify-between"
                >
                    <Text className="font-bold text-2xl text-kiitos-black">Kitos<Text className="text-kiitos-orange">.</Text></Text>

                    {/* Desktop Menu */}
                    <View className="hidden md:flex flex-row items-center gap-8">
                        <TouchableOpacity onPress={() => router.push('/pricing')}>
                            <Text className="text-sm font-medium text-gray-600 hover:text-kiitos-orange transition-colors">
                                {t('nav.for_restaurants')}
                            </Text>
                        </TouchableOpacity>

                        {user ? (
                            <TouchableOpacity onPress={handleDashboardNavigation}>
                                <Text className="text-sm font-medium text-kiitos-orange hover:text-orange-700 transition-colors">
                                    {t('nav.go_to_dashboard', { name: user.name?.split(' ')[0] })}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => router.push('/login')}>
                                <Text className="text-sm font-medium text-gray-600 hover:text-kiitos-orange transition-colors">
                                    {t('nav.login')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="bg-kiitos-orange px-5 py-2.5 rounded-full shadow-lg shadow-kiitos-orange/20 hover:bg-orange-600 transition-colors"
                        >
                            <Text className="text-white text-sm font-bold">{t('nav.signup')}</Text>
                        </TouchableOpacity>

                        <LanguagePill />
                    </View>

                    {/* Mobile Menu Button */}
                    <View className="md:hidden flex-row items-center gap-4">
                        <LanguagePill />
                        <TouchableOpacity p-2 onPress={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X size={24} color="#111827" /> : <Menu size={24} color="#111827" />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <View className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 p-6 shadow-xl">
                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={() => router.push('/pricing')}>
                            <Text className="text-gray-800 font-medium text-lg">{t('nav.for_restaurants')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={handleDashboardNavigation}>
                            <Text className="text-gray-800 font-medium text-lg">
                                {user ? t('nav.dashboard') : t('nav.login')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="mt-4 bg-kiitos-orange px-5 py-4 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">{t('nav.signup')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* 1. HERO SECTION */}
            <View className="w-full relative overflow-hidden bg-white">
                <View className="absolute top-0 right-0 w-1/2 h-full bg-kiitos-cream/50 -skew-x-12 translate-x-20" />

                <View
                    style={{ maxWidth: 1200 }}
                    className="mx-auto px-6 pt-12 md:pt-20 pb-16 md:pb-24 flex-col md:flex-row items-center gap-12 relative z-10"
                >
                    <View className="flex-1 text-center md:text-left">
                        <View className="inline-flex self-center md:self-start bg-kiitos-orange/10 px-4 py-1.5 rounded-full border border-kiitos-orange/20 mb-6 font-bold">
                            <Text className="text-kiitos-orange font-bold text-xs uppercase tracking-wider">{t('hero.badge')}</Text>
                        </View>
                        <Text className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-kiitos-black mb-6 leading-tight tracking-tight">
                            {t('hero.title_start')} <Text className="text-kiitos-orange">{t('hero.title_highlight')}</Text>.
                        </Text>
                        <Text className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto md:mx-0">
                            {t('hero.description')}
                        </Text>
                        <View className="flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <TouchableOpacity
                                onPress={() => router.push('/pricing')}
                                className="bg-kiitos-orange px-8 py-4 rounded-xl shadow-xl shadow-kiitos-orange/30 hover:bg-orange-600 active:scale-95 transition-all flex-row items-center justify-center gap-2"
                            >
                                <Text className="text-white font-bold text-lg">{t('hero.btn_restaurants')}</Text>
                                <ArrowRight color="white" size={20} strokeWidth={3} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => router.push('/')}
                                className="bg-white border-2 border-kiitos-black px-8 py-4 rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex-row items-center justify-center gap-2"
                            >
                                <Text className="text-kiitos-black font-bold text-lg">{t('hero.btn_diners')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="mt-8 flex-row items-center justify-center md:justify-start gap-6">
                            <View className="flex-row items-center gap-2">
                                <CheckCircle size={16} color="#10B981" />
                                <Text className="text-gray-500 text-sm">{t('hero.feat_no_app')}</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <CheckCircle size={16} color="#10B981" />
                                <Text className="text-gray-500 text-sm">{t('hero.feat_instant')}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 w-full max-w-md md:max-w-full">
                        <View className="relative">
                            <View className="absolute inset-0 bg-kiitos-orange rounded-3xl rotate-6 opacity-20 blur-xl" />
                            <View className="aspect-[4/3] bg-gray-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                <Image
                                    source={{ uri: 'https://a1d29937b6ef0a112cc1d211b3fbc994.cdn.bubble.io/f1765991225702x496902933994371800/camarero-feliz-sirviendo-comida-un-grupo-de-amigos-alegres-en-un-pub.jpg?_gl=1*u3bqr2*_gcl_au*NjgwMDE3NzkyLjE3NTg1NjA5MTk.*_ga*MTI5MTI4ODI3Ny4xNzEyODU1NDE4*_ga_BFPVR2DEE2*czE3NjU5ODk5NjYkbzQzMyRnMSR0MTc2NTk5MTIxMyRqNTQkbDAkaDA.' }}
                                    className="w-full h-full object-cover"
                                    resizeMode="cover"
                                />
                            </View>

                            <View className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex-row items-center gap-3">
                                <View className="w-10 h-10 bg-kiitos-green/10 rounded-full items-center justify-center">
                                    <SmartphoneNfc color="#10B981" size={20} />
                                </View>
                                <View>
                                    <Text className="text-xs text-gray-400 font-medium">{t('hero.stats_label')}</Text>
                                    <Text className="text-lg font-bold text-kiitos-black">{t('hero.stats_value')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* 2. HOW IT WORKS */}
            <View className="w-full px-6 py-20 md:py-32 bg-kiitos-cream/30">
                <View style={{ maxWidth: 1200 }} className="mx-auto">
                    <View className="text-center mb-16">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">{t('how_it_works.badge')}</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-kiitos-black">{t('how_it_works.title')}</Text>
                    </View>

                    <View className="flex-col md:flex-row gap-8">
                        {/* Step 1 */}
                        <View className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-50 relative overflow-hidden group">
                            <View className="absolute top-0 right-0 w-24 h-24 bg-kiitos-orange/5 rounded-bl-full -mr-4 -mt-4" />
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-xl items-center justify-center mb-6">
                                <Smartphone color="#f89219" size={28} />
                            </View>
                            <Text className="text-4xl font-bold text-gray-100 absolute top-4 right-6">01</Text>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">{t('how_it_works.step1_title')}</Text>
                            <Text className="text-gray-500 leading-relaxed">{t('how_it_works.step1_desc')}</Text>
                        </View>

                        {/* Step 2 */}
                        <View className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-50 relative overflow-hidden group">
                            <View className="absolute top-0 right-0 w-24 h-24 bg-kiitos-orange/5 rounded-bl-full -mr-4 -mt-4" />
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-xl items-center justify-center mb-6">
                                <CreditCard color="#f89219" size={28} />
                            </View>
                            <Text className="text-4xl font-bold text-gray-100 absolute top-4 right-6">02</Text>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">{t('how_it_works.step2_title')}</Text>
                            <Text className="text-gray-500 leading-relaxed">{t('how_it_works.step2_desc')}</Text>
                        </View>

                        {/* Step 3 */}
                        <View className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-50 relative overflow-hidden group">
                            <View className="absolute top-0 right-0 w-24 h-24 bg-kiitos-orange/5 rounded-bl-full -mr-4 -mt-4" />
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-xl items-center justify-center mb-6">
                                <Zap color="#f89219" size={28} />
                            </View>
                            <Text className="text-4xl font-bold text-gray-100 absolute top-4 right-6">03</Text>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">{t('how_it_works.step3_title')}</Text>
                            <Text className="text-gray-500 leading-relaxed">{t('how_it_works.step3_desc')}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. FOR RESTAURANTS */}
            <View className="w-full px-6 py-20 md:py-32 bg-white">
                <View style={{ maxWidth: 1200 }} className="mx-auto flex-col md:flex-row items-center gap-16">
                    <View className="flex-1">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">{t('restaurants.badge')}</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-kiitos-black mb-10 leading-tight">
                            {t('restaurants.title_start')} <Text className="text-kiitos-orange">{t('restaurants.title_highlight')}</Text>
                        </Text>

                        <View className="gap-6">
                            <View className="flex-row items-start gap-4">
                                <View className="w-12 h-12 bg-kiitos-black rounded-lg items-center justify-center shrink-0">
                                    <Clock color="white" size={24} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-kiitos-black mb-1">{t('restaurants.feat1_title')}</Text>
                                    <Text className="text-gray-500">{t('restaurants.feat1_desc')}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-start gap-4">
                                <View className="w-12 h-12 bg-kiitos-black rounded-lg items-center justify-center shrink-0">
                                    <TrendingUp color="white" size={24} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-kiitos-black mb-1">{t('restaurants.feat2_title')}</Text>
                                    <Text className="text-gray-500">{t('restaurants.feat2_desc')}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-start gap-4">
                                <View className="w-12 h-12 bg-kiitos-black rounded-lg items-center justify-center shrink-0">
                                    <CheckCircle color="white" size={24} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-kiitos-black mb-1">{t('restaurants.feat3_title')}</Text>
                                    <Text className="text-gray-500">{t('restaurants.feat3_desc')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 w-full bg-gray-50 rounded-3xl p-4 md:p-8 border border-gray-100 shadow-xl">
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop' }}
                            className="w-full h-64 md:h-[400px] rounded-xl"
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </View>

            {/* 4. FOR CUSTOMERS */}
            <View className="w-full px-6 py-20 md:py-32 bg-kiitos-black">
                <View style={{ maxWidth: 1200 }} className="mx-auto">
                    <View className="text-center mb-16">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">{t('diners.badge')}</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-white">{t('diners.title')}</Text>
                    </View>

                    <View className="flex-col md:flex-row flex-wrap gap-6">
                        <View className="flex-1 min-w-[250px] bg-gray-900 p-8 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat1_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat1_desc')}</Text>
                        </View>
                        <View className="flex-1 min-w-[250px] bg-gray-900 p-8 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat2_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat2_desc')}</Text>
                        </View>
                        <View className="flex-1 min-w-[250px] bg-gray-900 p-8 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat3_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat3_desc')}</Text>
                        </View>
                        <View className="flex-1 min-w-[250px] bg-gray-900 p-8 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat4_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat4_desc')}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 5. SOCIAL PROOF */}
            <View className="w-full py-16 bg-kiitos-orange relative overflow-hidden">
                <View className="absolute inset-0 bg-black/5 opacity-10" />
                <View
                    style={{ maxWidth: 1200 }}
                    className="mx-auto px-6 flex-col md:flex-row justify-around items-center gap-10 relative z-10 text-center"
                >
                    <View>
                        <Text className="text-4xl md:text-5xl font-black text-white mb-1">10M+</Text>
                        <Text className="text-white/80 font-bold tracking-wider text-xs">{t('social.users')}</Text>
                    </View>
                    <View className="hidden md:block w-px h-16 bg-white/20" />
                    <View>
                        <Text className="text-4xl md:text-5xl font-black text-white mb-1">500+</Text>
                        <Text className="text-white/80 font-bold tracking-wider text-xs">{t('social.restaurants')}</Text>
                    </View>
                    <View className="hidden md:block w-px h-16 bg-white/20" />
                    <View>
                        <Text className="text-4xl md:text-5xl font-black text-white mb-1">100%</Text>
                        <Text className="text-white/80 font-bold tracking-wider text-xs">{t('social.secure')}</Text>
                    </View>
                </View>
            </View>

            {/* 6. FOOTER */}
            <View className="w-full bg-kiitos-black pt-20 pb-10 border-t border-gray-900 px-6">
                <View style={{ maxWidth: 1200 }} className="mx-auto">
                    <View className="flex-col md:flex-row justify-between items-start gap-12 mb-20">
                        <View className="max-w-sm">
                            <Text className="font-bold text-3xl text-white mb-6">Kitos<Text className="text-kiitos-orange">.</Text></Text>
                            <Text className="text-gray-400 leading-relaxed text-base">
                                {t('footer.description')}
                            </Text>
                        </View>

                        <View className="flex-row gap-16 flex-wrap">
                            <View>
                                <Text className="text-white font-bold mb-6 text-lg">{t('footer.title_product')}</Text>
                                <View className="gap-3">
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('nav.for_restaurants')}</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('hero.btn_diners')}</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">Pricing</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('footer.request_demo')}</Text>
                                </View>
                            </View>
                            <View>
                                <Text className="text-white font-bold mb-6 text-lg">{t('footer.title_company')}</Text>
                                <View className="gap-3">
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('footer.about')}</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('footer.careers')}</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('footer.blog')}</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">{t('footer.contact')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="border-t border-gray-900 pt-10 flex-col md:flex-row justify-between items-center gap-6">
                        <Text className="text-gray-500 text-sm">{t('footer.copyright')}</Text>
                        <View className="flex-row gap-8">
                            <Text className="text-gray-500 text-sm hover:text-white cursor-pointer">{t('footer.privacy')}</Text>
                            <Text className="text-gray-500 text-sm hover:text-white cursor-pointer">{t('footer.terms')}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
