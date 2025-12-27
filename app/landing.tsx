import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, useWindowDimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CreditCard, Smartphone, Zap, Clock, TrendingUp, Shield, Menu, X, ArrowRight, CheckCircle, SmartphoneNfc, Globe, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';

// ============================================
// ANIMATION COMPONENTS
// ============================================

// Animated Section - Fades in when scrolled into view
const AnimatedSection = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;
    const [hasAnimated, setHasAnimated] = useState(false);

    const onViewEnter = useCallback(() => {
        if (hasAnimated) return;
        setHasAnimated(true);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [hasAnimated, delay]);

    return (
        <Animated.View
            onLayout={onViewEnter}
            style={{ opacity: fadeAnim, transform: [{ translateY }] }}
            className={className}
        >
            {children}
        </Animated.View>
    );
};

// Animated Counter - Counts up from 0 to target
const AnimatedCounter = ({ target, suffix = '', prefix = '', duration = 2000 }: { target: number; suffix?: string; prefix?: string; duration?: number }) => {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    const startCounting = useCallback(() => {
        if (hasStarted) return;
        setHasStarted(true);

        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(target * easeOut));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(target);
            }
        };
        requestAnimationFrame(animate);
    }, [hasStarted, target, duration]);

    return (
        <View onLayout={startCounting}>
            <Text className="text-4xl md:text-5xl font-black text-white mb-1">
                {prefix}{count.toLocaleString()}{suffix}
            </Text>
        </View>
    );
};

// FAQ Accordion Item
const FAQItem = ({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const heightAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(rotateAnim, {
                toValue: isOpen ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(heightAnim, {
                toValue: isOpen ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [isOpen]);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.8}
            className="bg-gray-50 rounded-2xl overflow-hidden hover:bg-gray-100 transition-colors"
        >
            <View className="p-6 flex-row items-center justify-between">
                <Text className="font-bold text-lg text-kiitos-black flex-1 pr-4">{question}</Text>
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                    <ChevronDown size={24} color="#f89219" />
                </Animated.View>
            </View>
            {isOpen && (
                <View className="px-6 pb-6 pt-0">
                    <Text className="text-gray-600 leading-relaxed">{answer}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0); // First FAQ open by default
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    // Scroll Refs
    const scrollViewRef = React.useRef<ScrollView>(null);
    const [sectionCoords, setSectionCoords] = useState({
        hero: 0,
        restaurants: 0,
        diners: 0
    });

    const scrollToSection = (yKey: keyof typeof sectionCoords) => {
        scrollViewRef.current?.scrollTo({ y: sectionCoords[yKey], animated: true });
        setIsMenuOpen(false);
    };

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
            className="flex-row items-center bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-full transition-colors"
        >
            <Text className="mr-2 text-base">{i18n.language === 'es' ? '🇲🇽' : '🇺🇸'}</Text>
            <Text className="text-xs font-bold text-gray-700 uppercase">{i18n.language}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView ref={scrollViewRef} className="flex-1 bg-white">
            {/* Navbar */}
            <View className="w-full px-4 py-4 sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/50 shadow-sm">
                <View
                    style={{ maxWidth: 1200 }}
                    className="mx-auto w-full flex-row items-center justify-between"
                >
                    <TouchableOpacity onPress={() => scrollToSection('hero')}>
                        <Image
                            source={require('../assets/kitos-logo-rect-black.png')}
                            style={{ width: 100, height: 28 }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>

                    {/* Desktop Menu */}
                    <View className="hidden md:flex flex-row items-center gap-8">
                        <TouchableOpacity onPress={() => scrollToSection('restaurants')}>
                            <Text className="text-sm font-semibold text-gray-600 hover:text-kiitos-orange transition-colors">
                                {t('nav.for_restaurants')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => scrollToSection('diners')}>
                            <Text className="text-sm font-semibold text-gray-600 hover:text-kiitos-orange transition-colors">
                                {t('nav.for_diners')}
                            </Text>
                        </TouchableOpacity>

                        {user ? (
                            <TouchableOpacity onPress={handleDashboardNavigation}>
                                <Text className="text-sm font-semibold text-kiitos-orange hover:text-orange-700 transition-colors">
                                    {t('nav.go_to_dashboard', { name: user.name?.split(' ')[0] })}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => router.push('/login')}>
                                <Text className="text-sm font-semibold text-gray-600 hover:text-kiitos-orange transition-colors">
                                    {t('nav.login')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="bg-kiitos-orange px-6 py-2.5 rounded-full shadow-lg shadow-kiitos-orange/30 hover:shadow-xl hover:-translate-y-0.5 hover:bg-orange-600 transition-all"
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
                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={() => scrollToSection('restaurants')}>
                            <Text className="text-gray-800 font-medium text-lg">{t('nav.for_restaurants')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={() => scrollToSection('diners')}>
                            <Text className="text-gray-800 font-medium text-lg">{t('nav.for_diners')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={handleDashboardNavigation}>
                            <Text className="text-gray-800 font-medium text-lg">
                                {user ? t('nav.dashboard') : t('nav.login')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="mt-4 bg-kiitos-black px-5 py-4 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">{t('nav.signup')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* 1. HERO SECTION */}
            <View
                onLayout={(event) => setSectionCoords(prev => ({ ...prev, hero: event.nativeEvent.layout.y }))}
                className="w-full relative overflow-hidden bg-white"
            >
                <View className="absolute top-0 right-0 w-1/2 h-full bg-kiitos-cream/50 -skew-x-12 translate-x-20" />

                <View
                    style={{ maxWidth: 1200 }}
                    className="mx-auto px-6 pt-12 md:pt-20 pb-24 md:pb-32 flex-col md:flex-row items-center gap-12 md:gap-12 relative z-10"
                >
                    <View className="w-full md:flex-1 text-center md:text-left">
                        <View className="inline-flex self-center md:self-start bg-kiitos-orange/10 px-4 py-1.5 rounded-full border border-kiitos-orange/20 mb-6 font-bold hover:bg-kiitos-orange/20 hover:scale-105 transition-all cursor-default">
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
                                onPress={() => scrollToSection('restaurants')}
                                className="bg-kiitos-orange px-8 py-4 rounded-xl shadow-xl shadow-kiitos-orange/30 hover:bg-orange-600 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex-row items-center justify-center gap-2"
                            >
                                <Text className="text-white font-bold text-lg">{t('hero.btn_restaurants')}</Text>
                                <ArrowRight color="white" size={20} strokeWidth={3} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => scrollToSection('diners')}
                                className="bg-white border-2 border-kiitos-black px-8 py-4 rounded-xl hover:bg-kiitos-black hover:border-kiitos-black active:scale-95 transition-all duration-300 flex-row items-center justify-center gap-2 group"
                            >
                                <Text className="text-kiitos-black font-bold text-lg group-hover:text-white transition-colors">{t('hero.btn_diners')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="mt-8 flex-row items-center justify-center md:justify-start gap-6">
                            <View className="flex-row items-center gap-2 hover:scale-105 transition-transform cursor-default">
                                <CheckCircle size={16} color="#10B981" />
                                <Text className="text-gray-500 text-sm">{t('hero.feat_no_app')}</Text>
                            </View>
                            <View className="flex-row items-center gap-2 hover:scale-105 transition-transform cursor-default">
                                <CheckCircle size={16} color="#10B981" />
                                <Text className="text-gray-500 text-sm">{t('hero.feat_instant')}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="w-full md:flex-1 max-w-md md:max-w-full items-center mt-8 md:mt-0 mb-8 md:mb-0">
                        <View className="relative w-full group">
                            <View className="absolute inset-0 bg-kiitos-orange rounded-3xl rotate-6 opacity-20 blur-xl group-hover:rotate-12 group-hover:opacity-30 transition-all duration-500" />
                            <View className={`w-full ${isDesktop ? 'aspect-[4/3]' : 'aspect-square'} bg-gray-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-white group-hover:shadow-3xl group-hover:scale-[1.02] transition-all duration-500`}>
                                <Image
                                    source={{ uri: 'https://a1d29937b6ef0a112cc1d211b3fbc994.cdn.bubble.io/f1765991225702x496902933994371800/camarero-feliz-sirviendo-comida-un-grupo-de-amigos-alegres-en-un-pub.jpg?_gl=1*u3bqr2*_gcl_au*NjgwMDE3NzkyLjE3NTg1NjA5MTk.*_ga*MTI5MTI4ODI3Ny4xNzEyODU1NDE4*_ga_BFPVR2DEE2*czE3NjU5ODk5NjYkbzQzMyRnMSR0MTc2NTk5MTIxMyRqNTQkbDAkaDA.' }}
                                    className="w-full h-full"
                                    resizeMode={isDesktop ? "cover" : "contain"}
                                />
                            </View>

                            <View className="absolute -bottom-6 -left-2 md:-left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex-row items-center gap-3 transform scale-90 md:scale-100 origin-bottom-left hover:scale-95 md:hover:scale-105 hover:shadow-2xl transition-all duration-300">
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

            {/* 1.5 COMPARISON SECTION (Problem vs Solution) */}
            <View className="w-full px-6 py-20 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                <View style={{ maxWidth: 1300 }} className="mx-auto">
                    <AnimatedSection>
                        <View className="text-center mb-16">
                            <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-3">{t('comparison.subtitle')}</Text>
                            <Text className="text-center text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('comparison.title')}</Text>
                            <Text className="text-gray-500 text-lg max-w-2xl mx-auto">{t('comparison.description')}</Text>
                        </View>
                    </AnimatedSection>

                    <View className="flex-col md:flex-row gap-10 items-stretch relative">

                        {/* VS BADGE (Desktop) */}
                        <View className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full items-center justify-center border-4 border-white shadow-2xl hover:scale-110 transition-transform">
                            <Text className="text-white font-black text-3xl italic">VS</Text>
                        </View>

                        {/* Old Way */}
                        <View className="w-full md:flex-1 bg-white p-10 rounded-3xl border border-red-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <View className="w-14 h-14 bg-red-50 rounded-2xl items-center justify-center mb-6 mx-auto hover:scale-110 transition-transform">
                                <X size={28} color="#EF4444" />
                            </View>
                            <Text className="text-center text-red-500 font-bold mb-8 uppercase tracking-widest text-sm">{t('comparison.old_way_title')}</Text>
                            <View className="gap-4">
                                <View className="flex-row items-center gap-4 bg-red-50/50 p-4 rounded-xl hover:bg-red-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center shrink-0"><X size={20} color="#EF4444" /></View>
                                    <Text className="text-gray-600 font-medium text-lg line-through decoration-red-300 decoration-2">{t('comparison.old_step1')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-red-50/50 p-4 rounded-xl hover:bg-red-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center shrink-0"><X size={20} color="#EF4444" /></View>
                                    <Text className="text-gray-600 font-medium text-lg line-through decoration-red-300 decoration-2">{t('comparison.old_step2')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-red-50/50 p-4 rounded-xl hover:bg-red-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center shrink-0"><X size={20} color="#EF4444" /></View>
                                    <Text className="text-gray-600 font-medium text-lg line-through decoration-red-300 decoration-2">{t('comparison.old_step3')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-red-50/50 p-4 rounded-xl hover:bg-red-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center shrink-0"><X size={20} color="#EF4444" /></View>
                                    <Text className="text-gray-600 font-medium text-lg line-through decoration-red-300 decoration-2">{t('comparison.old_step4')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-red-50/50 p-4 rounded-xl hover:bg-red-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center shrink-0"><X size={20} color="#EF4444" /></View>
                                    <Text className="text-gray-600 font-medium text-lg line-through decoration-red-300 decoration-2">{t('comparison.old_step5')}</Text>
                                </View>
                            </View>
                            <View className="mt-8 pt-6 border-t border-red-100">
                                <Text className="text-center text-red-400 text-sm font-medium">{t('comparison.old_time')}</Text>
                            </View>
                        </View>

                        {/* Kitos Way */}
                        <View className="w-full md:flex-1 bg-gradient-to-br from-orange-50 to-white p-10 rounded-3xl border-2 border-kiitos-orange shadow-2xl relative overflow-hidden transform md:-translate-y-3 hover:shadow-3xl hover:-translate-y-5 transition-all duration-300">
                            <View className="absolute top-0 right-0 bg-kiitos-orange text-white px-5 py-2 rounded-bl-2xl shadow-lg">
                                <Text className="text-white text-xs font-bold tracking-widest">{t('comparison.badge')}</Text>
                            </View>
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-2xl items-center justify-center mb-6 mx-auto hover:scale-110 hover:rotate-12 transition-transform">
                                <Zap size={28} color="#f89219" />
                            </View>
                            <Text className="text-center text-kiitos-orange font-bold mb-8 uppercase tracking-widest text-sm">{t('comparison.new_way_title')}</Text>
                            <View className="gap-4">
                                <View className="flex-row items-center gap-4 bg-green-50/50 p-4 rounded-xl hover:bg-green-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center shrink-0"><CheckCircle size={20} color="#10B981" /></View>
                                    <Text className="text-gray-900 font-bold text-xl">{t('comparison.new_step1')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-green-50/50 p-4 rounded-xl hover:bg-green-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center shrink-0"><CheckCircle size={20} color="#10B981" /></View>
                                    <Text className="text-gray-900 font-bold text-xl">{t('comparison.new_step2')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-green-50/50 p-4 rounded-xl hover:bg-green-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center shrink-0"><CheckCircle size={20} color="#10B981" /></View>
                                    <Text className="text-gray-900 font-bold text-xl">{t('comparison.new_step3')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-green-50/50 p-4 rounded-xl hover:bg-green-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center shrink-0"><CheckCircle size={20} color="#10B981" /></View>
                                    <Text className="text-gray-900 font-bold text-xl">{t('comparison.new_step4')}</Text>
                                </View>
                                <View className="flex-row items-center gap-4 bg-green-50/50 p-4 rounded-xl hover:bg-green-50 hover:scale-[1.02] transition-all">
                                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center shrink-0"><CheckCircle size={20} color="#10B981" /></View>
                                    <Text className="text-gray-900 font-bold text-xl">{t('comparison.new_step5')}</Text>
                                </View>
                            </View>
                            <View className="mt-8 pt-6 border-t border-kiitos-orange/20">
                                <Text className="text-center text-kiitos-orange text-sm font-bold">{t('comparison.new_time')}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* 2. HOW IT WORKS (Kept as is, classic) */}
            <View className="w-full px-6 py-10 md:py-32 bg-white z-0">
                <View style={{ maxWidth: 1200 }} className="mx-auto">
                    <View className="text-center mb-10 md:mb-16">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">{t('how_it_works.badge')}</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-kiitos-black">{t('how_it_works.title')}</Text>
                    </View>

                    <View className="flex-col md:flex-row gap-4 md:gap-8">
                        {/* Step 1 */}
                        <View className="flex-1 bg-gray-50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden group items-center md:items-start text-center md:text-left hover:scale-105 transition-transform duration-300">
                            <View className="w-14 h-14 bg-white rounded-xl items-center justify-center mb-6 shadow-sm">
                                <Smartphone color="#f89219" size={28} />
                            </View>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">{t('how_it_works.step1_title')}</Text>
                            <Text className="text-gray-500 leading-relaxed">{t('how_it_works.step1_desc')}</Text>
                        </View>

                        {/* Step 2 */}
                        <View className="flex-1 bg-gray-50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden group items-center md:items-start text-center md:text-left hover:scale-105 transition-transform duration-300">
                            <View className="w-14 h-14 bg-white rounded-xl items-center justify-center mb-6 shadow-sm">
                                <CreditCard color="#f89219" size={28} />
                            </View>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">{t('how_it_works.step2_title')}</Text>
                            <Text className="text-gray-500 leading-relaxed">{t('how_it_works.step2_desc')}</Text>
                        </View>

                        {/* Step 3 */}
                        <View className="flex-1 bg-gray-50 p-8 rounded-2xl border border-gray-100 relative overflow-hidden group items-center md:items-start text-center md:text-left hover:scale-105 transition-transform duration-300">
                            <View className="w-14 h-14 bg-white rounded-xl items-center justify-center mb-6 shadow-sm">
                                <Zap color="#f89219" size={28} />
                            </View>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">{t('how_it_works.step3_title')}</Text>
                            <Text className="text-gray-500 leading-relaxed">{t('how_it_works.step3_desc')}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. FOR RESTAURANTS (Zig-Zag Refactor) */}
            <View
                onLayout={(event) => setSectionCoords(prev => ({ ...prev, restaurants: event.nativeEvent.layout.y }))}
                className="w-full px-6 py-10 md:py-32 bg-gray-50"
            >
                <View style={{ maxWidth: 1200 }} className="mx-auto flex-col gap-24">
                    <View className="text-center mb-4">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">{t('restaurants.badge')}</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-kiitos-black">{t('restaurants.title_start')} {t('restaurants.title_highlight')}</Text>
                    </View>

                    {/* Feature 1: Speed (Text Left, Image Right) */}
                    <View className="flex-col md:flex-row items-center gap-12 md:gap-20 group">
                        <View className="w-full md:flex-1 order-2 md:order-1 text-center md:text-left">
                            <View className="w-12 h-12 bg-kiitos-black rounded-xl items-center justify-center mb-6 mx-auto md:mx-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                <Clock color="white" size={24} />
                            </View>
                            <Text className="text-3xl font-bold text-kiitos-black mb-4">{t('expanded_features.speed_title')}</Text>
                            <Text className="text-gray-600 text-lg leading-relaxed">{t('expanded_features.speed_desc')}</Text>
                        </View>
                        <View className="w-full md:flex-1 order-1 md:order-2 overflow-hidden rounded-3xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300">
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop' }}
                                className="w-full aspect-video"
                                resizeMode="cover"
                            />
                        </View>
                    </View>

                    {/* Feature 2: Splitting (Image Left, Text Right) */}
                    <View className="flex-col md:flex-row items-center gap-12 md:gap-20 group">
                        <View className="w-full md:flex-1 order-1 overflow-hidden rounded-3xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300">
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop' }}
                                className="w-full aspect-video"
                                resizeMode="cover"
                            />
                        </View>
                        <View className="w-full md:flex-1 order-2 text-center md:text-left">
                            <View className="w-12 h-12 bg-kiitos-black rounded-xl items-center justify-center mb-6 mx-auto md:mx-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                                <CreditCard color="white" size={24} />
                            </View>
                            <Text className="text-3xl font-bold text-kiitos-black mb-4">{t('expanded_features.split_title')}</Text>
                            <Text className="text-gray-600 text-lg leading-relaxed">{t('expanded_features.split_desc')}</Text>
                        </View>
                    </View>

                    {/* Feature 3: Data (Text Left, Image Right) */}
                    <View className="flex-col md:flex-row items-center gap-12 md:gap-20 group">
                        <View className="w-full md:flex-1 order-2 md:order-1 text-center md:text-left">
                            <View className="w-12 h-12 bg-kiitos-black rounded-xl items-center justify-center mb-6 mx-auto md:mx-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                <TrendingUp color="white" size={24} />
                            </View>
                            <Text className="text-3xl font-bold text-kiitos-black mb-4">{t('expanded_features.data_title')}</Text>
                            <Text className="text-gray-600 text-lg leading-relaxed">{t('expanded_features.data_desc')}</Text>
                        </View>
                        <View className="w-full md:flex-1 order-1 md:order-2 overflow-hidden rounded-3xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300">
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop' }}
                                className="w-full aspect-video"
                                resizeMode="cover"
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* 4. FOR CUSTOMERS (Dark Mode) */}
            <View
                onLayout={(event) => setSectionCoords(prev => ({ ...prev, diners: event.nativeEvent.layout.y }))}
                className="w-full px-6 py-10 md:py-32 bg-kiitos-black text-white"
            >
                <View style={{ maxWidth: 1200 }} className="mx-auto">
                    <View className="text-center mb-10 md:mb-16">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">{t('diners.badge')}</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-white">{t('diners.title')}</Text>
                    </View>

                    <View className="flex-col md:flex-row flex-wrap gap-4 md:gap-6">
                        <View className="flex-1 min-w-[250px] bg-white/5 p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat1_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat1_desc')}</Text>
                        </View>
                        <View className="flex-1 min-w-[250px] bg-white/5 p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat2_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat2_desc')}</Text>
                        </View>
                        <View className="flex-1 min-w-[250px] bg-white/5 p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat3_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat3_desc')}</Text>
                        </View>
                        <View className="flex-1 min-w-[250px] bg-white/5 p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">{t('diners.feat4_title')}</Text>
                            <Text className="text-gray-400 text-sm leading-relaxed">{t('diners.feat4_desc')}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 5. FAQ SECTION */}
            <View className="w-full px-6 py-16 bg-white">
                <View style={{ maxWidth: 800 }} className="mx-auto">
                    <AnimatedSection>
                        <Text className="text-3xl font-bold text-center text-kiitos-black mb-12">{t('faq.title')}</Text>
                    </AnimatedSection>
                    <View className="gap-4">
                        <AnimatedSection delay={100}>
                            <FAQItem
                                question={t('faq.q1')}
                                answer={t('faq.a1')}
                                isOpen={openFaqIndex === 0}
                                onToggle={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
                            />
                        </AnimatedSection>
                        <AnimatedSection delay={200}>
                            <FAQItem
                                question={t('faq.q2')}
                                answer={t('faq.a2')}
                                isOpen={openFaqIndex === 1}
                                onToggle={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
                            />
                        </AnimatedSection>
                        <AnimatedSection delay={300}>
                            <FAQItem
                                question={t('faq.q3')}
                                answer={t('faq.a3')}
                                isOpen={openFaqIndex === 2}
                                onToggle={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
                            />
                        </AnimatedSection>
                    </View>
                </View>
            </View>

            {/* 6. CTA BAND */}
            <View className="w-full py-20 bg-kiitos-orange">
                <View style={{ maxWidth: 1000 }} className="mx-auto px-6 text-center">
                    <Text className="text-3xl md:text-5xl font-black text-white mb-4">{t('final_cta.title')}</Text>
                    <Text className="text-white/90 text-xl mb-10">{t('final_cta.subtitle')}</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/pricing')}
                        className="bg-white px-10 py-5 rounded-full inline-flex self-center shadow-2xl hover:scale-105 transition-transform"
                    >
                        <Text className="text-kiitos-orange font-bold text-xl">{t('final_cta.btn')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 5. SOCIAL PROOF - Animated Counters */}
            <View className="w-full py-16 bg-kiitos-orange relative overflow-hidden">
                <View className="absolute inset-0 bg-black/5 opacity-10" />
                <View
                    style={{ maxWidth: 1200 }}
                    className="mx-auto px-6 flex-col md:flex-row justify-around items-center gap-10 relative z-10 text-center"
                >
                    <AnimatedSection delay={0}>
                        <View className="items-center">
                            <AnimatedCounter target={10000000} suffix="+" duration={2500} />
                            <Text className="text-white/80 font-bold tracking-wider text-xs">{t('social.users')}</Text>
                        </View>
                    </AnimatedSection>
                    <View className="hidden md:block w-px h-16 bg-white/20" />
                    <AnimatedSection delay={200}>
                        <View className="items-center">
                            <AnimatedCounter target={500} suffix="+" duration={2000} />
                            <Text className="text-white/80 font-bold tracking-wider text-xs">{t('social.restaurants')}</Text>
                        </View>
                    </AnimatedSection>
                    <View className="hidden md:block w-px h-16 bg-white/20" />
                    <AnimatedSection delay={400}>
                        <View className="items-center">
                            <AnimatedCounter target={100} suffix="%" duration={1500} />
                            <Text className="text-white/80 font-bold tracking-wider text-xs">{t('social.secure')}</Text>
                        </View>
                    </AnimatedSection>
                </View>
            </View>

            {/* 6. FOOTER */}
            <View className="w-full bg-kiitos-black pt-10 md:pt-20 pb-10 border-t border-gray-900 px-6">
                <View style={{ maxWidth: 1200 }} className="mx-auto">
                    <View className="flex-col md:flex-row justify-between items-start gap-10 md:gap-12 mb-10 md:mb-20">
                        <View className="max-w-sm">
                            <Image
                                source={require('../assets/kitos-logo-rect-white.png')}
                                style={{ width: 120, height: 34, marginBottom: 24 }}
                                resizeMode="contain"
                            />
                            <Text className="text-gray-400 leading-relaxed text-base">
                                {t('footer.description')}
                            </Text>
                        </View>

                        <View className="flex-row gap-8 md:gap-16 flex-wrap">
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
