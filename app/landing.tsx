import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Smartphone, Zap, Clock, TrendingUp, Shield, Menu, X, ArrowRight, CheckCircle, SmartphoneNfc } from 'lucide-react-native';

export default function LandingPage() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Navbar */}
            <View className="w-full px-4 py-4 sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <View className="max-w-7xl mx-auto w-full flex-row items-center justify-between">
                    <Text className="font-bold text-2xl text-kiitos-black">Kitos<Text className="text-kiitos-orange">.</Text></Text>

                    {/* Desktop Menu */}
                    <View className="hidden md:flex flex-row items-center gap-8">
                        <TouchableOpacity onPress={() => router.push('/pricing')}>
                            <Text className="text-sm font-medium text-gray-600 hover:text-kiitos-orange transition-colors">For Restaurants</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/login' as any)}>
                            <Text className="text-sm font-medium text-gray-600 hover:text-kiitos-orange transition-colors">Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="bg-kiitos-orange px-5 py-2.5 rounded-full shadow-lg shadow-kiitos-orange/20 hover:bg-orange-600 transition-colors"
                        >
                            <Text className="text-white text-sm font-bold">Get Started</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Mobile Menu Button */}
                    <TouchableOpacity className="md:hidden p-2" onPress={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} color="#111827" /> : <Menu size={24} color="#111827" />}
                    </TouchableOpacity>
                </View>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <View className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 p-4 shadow-xl">
                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={() => router.push('/pricing')}>
                            <Text className="text-gray-800 font-medium text-lg">For Restaurants</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="py-3 px-2 rounded-lg hover:bg-gray-50" onPress={() => router.push('/login' as any)}>
                            <Text className="text-gray-800 font-medium text-lg">Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="mt-4 bg-kiitos-orange px-5 py-3 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Get Started</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* 1. HERO SECTION */}
            <View className="w-full relative overflow-hidden bg-white">
                <View className="absolute top-0 right-0 w-1/2 h-full bg-kiitos-cream/50 -skew-x-12 translate-x-20" />

                <View className="max-w-7xl mx-auto px-4 pt-20 pb-24 flex-col md:flex-row items-center gap-12 relative z-10">
                    <View className="flex-1 text-center md:text-left">
                        <View className="inline-flex self-center md:self-start bg-kiitos-orange/10 px-4 py-1.5 rounded-full border border-kiitos-orange/20 mb-6">
                            <Text className="text-kiitos-orange font-bold text-xs uppercase tracking-wider">The Future of Dining Payment</Text>
                        </View>
                        <Text className="text-5xl md:text-7xl font-extrabold text-kiitos-black mb-6 leading-tight tracking-tight">
                            The Fastest Way to Pay at <Text className="text-kiitos-orange">Restaurants</Text>.
                        </Text>
                        <Text className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto md:mx-0">
                            Scan, Split, and Pay in 10 seconds. No waiting for the bill, no app download required. Seamless integration for modern dining.
                        </Text>
                        <View className="flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <TouchableOpacity
                                onPress={() => router.push('/pricing')}
                                className="bg-kiitos-orange px-8 py-4 rounded-xl shadow-xl shadow-kiitos-orange/30 hover:bg-orange-600 active:scale-95 transition-all flex-row items-center justify-center gap-2"
                            >
                                <Text className="text-white font-bold text-lg">For Restaurants</Text>
                                <ArrowRight color="white" size={20} strokeWidth={3} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => router.push('/pricing')}
                                className="bg-white border-2 border-kiitos-black px-8 py-4 rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex-row items-center justify-center gap-2"
                            >
                                <Text className="text-kiitos-black font-bold text-lg">For Diners</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="mt-8 flex-row items-center justify-center md:justify-start gap-6">
                            <View className="flex-row items-center gap-2">
                                <CheckCircle size={16} color="#10B981" />
                                <Text className="text-gray-500 text-sm">No App Download</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <CheckCircle size={16} color="#10B981" />
                                <Text className="text-gray-500 text-sm">Instant Setup</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 w-full max-w-md md:max-w-full">
                        <View className="relative">
                            <View className="absolute inset-0 bg-kiitos-orange rounded-3xl rotate-6 opacity-20 blur-xl" />
                            {/* Placeholder for Generated Image 'landing_hero' */}
                            <View className="aspect-[4/3] bg-gray-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                <Image
                                    source={{ uri: 'https://a1d29937b6ef0a112cc1d211b3fbc994.cdn.bubble.io/f1765991225702x496902933994371800/camarero-feliz-sirviendo-comida-un-grupo-de-amigos-alegres-en-un-pub.jpg?_gl=1*u3bqr2*_gcl_au*NjgwMDE3NzkyLjE3NTg1NjA5MTk.*_ga*MTI5MTI4ODI3Ny4xNzEyODU1NDE4*_ga_BFPVR2DEE2*czE3NjU5ODk5NjYkbzQzMyRnMSR0MTc2NTk5MTIxMyRqNTQkbDAkaDA.' }}
                                    className="w-full h-full object-cover"
                                    resizeMode="cover"
                                />
                            </View>

                            {/* Floating Stats Card */}
                            <View className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex-row items-center gap-3 animate-bounce-slow">
                                <View className="w-10 h-10 bg-kiitos-green/10 rounded-full items-center justify-center">
                                    <SmartphoneNfc color="#10B981" size={20} />
                                </View>
                                <View>
                                    <Text className="text-xs text-gray-400 font-medium">Avg. Payment Time</Text>
                                    <Text className="text-lg font-bold text-kiitos-black">10 Seconds</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* 2. HOW IT WORKS */}
            <View className="w-full px-4 py-24 bg-kiitos-cream/30">
                <View className="max-w-7xl mx-auto">
                    <View className="text-center mb-16">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">Seamless Experience</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-kiitos-black">How it Works</Text>
                    </View>

                    <View className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Step 1 */}
                        <View className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
                            <View className="absolute top-0 right-0 w-24 h-24 bg-kiitos-orange/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150" />
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-xl items-center justify-center mb-6">
                                <Smartphone color="#f89219" size={28} />
                            </View>
                            <Text className="text-4xl font-bold text-gray-200 absolute top-4 right-6">01</Text>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">Scan the QR</Text>
                            <Text className="text-gray-500 leading-relaxed">
                                Simply scan the QR code at your table with your phone camera. No apps to download or accounts to create.
                            </Text>
                        </View>

                        {/* Step 2 */}
                        <View className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
                            <View className="absolute top-0 right-0 w-24 h-24 bg-kiitos-orange/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150" />
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-xl items-center justify-center mb-6">
                                <CreditCard color="#f89219" size={28} />
                            </View>
                            <Text className="text-4xl font-bold text-gray-200 absolute top-4 right-6">02</Text>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">Split the Bill</Text>
                            <Text className="text-gray-500 leading-relaxed">
                                Pay just your share or treat your friends. Custom split options make group dining effortless and fair.
                            </Text>
                        </View>

                        {/* Step 3 */}
                        <View className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
                            <View className="absolute top-0 right-0 w-24 h-24 bg-kiitos-orange/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150" />
                            <View className="w-14 h-14 bg-kiitos-orange/10 rounded-xl items-center justify-center mb-6">
                                <Zap color="#f89219" size={28} />
                            </View>
                            <Text className="text-4xl font-bold text-gray-200 absolute top-4 right-6">03</Text>
                            <Text className="text-xl font-bold text-kiitos-black mb-3">Leave in Seconds</Text>
                            <Text className="text-gray-500 leading-relaxed">
                                Payment is instant. No waiting for card machines or paper receipts. Just pay and go.
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. FOR RESTAURANTS */}
            <View className="w-full px-4 py-24 bg-white">
                <View className="max-w-7xl mx-auto flex-col md:flex-row items-center gap-16">
                    <View className="flex-1">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">For Restaurants</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-kiitos-black mb-8 leading-tight">
                            Run your restaurant <br />
                            <Text className="text-kiitos-orange">faster & smarter.</Text>
                        </Text>

                        <View className="space-y-6">
                            <View className="flex-row items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                <View className="w-12 h-12 bg-kiitos-black rounded-lg items-center justify-center shrink-0">
                                    <Clock color="white" size={24} />
                                </View>
                                <View>
                                    <Text className="text-xl font-bold text-kiitos-black mb-1">Turn Tables 15 Minutes Faster</Text>
                                    <Text className="text-gray-500">Eliminate the 15-minute average wait for the bill, allowing you to serve more guests per shift.</Text>
                                </View>
                            </View>

                            <View className="flex-row items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                <View className="w-12 h-12 bg-kiitos-black rounded-lg items-center justify-center shrink-0">
                                    <TrendingUp color="white" size={24} />
                                </View>
                                <View>
                                    <Text className="text-xl font-bold text-kiitos-black mb-1">40% More Tips for Staff</Text>
                                    <Text className="text-gray-500">Pre-calculated tip options and seamless digital payments encourage higher gratuity for your team.</Text>
                                </View>
                            </View>

                            <View className="flex-row items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                <View className="w-12 h-12 bg-kiitos-black rounded-lg items-center justify-center shrink-0">
                                    <CheckCircle color="white" size={24} />
                                </View>
                                <View>
                                    <Text className="text-xl font-bold text-kiitos-black mb-1">Click & Collect Included</Text>
                                    <Text className="text-gray-500">Diversify revenue streams with built-in pickup and ordering capabilities managed from one dashboard.</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 w-full bg-gray-50 rounded-3xl p-4 md:p-8 border border-gray-100 shadow-2xl">
                        {/* Placeholder for Generated Image 'dashboard_mockup' */}
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop' }}
                            className="w-full h-64 md:h-[400px] rounded-xl"
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </View>

            {/* 4. FOR CUSTOMERS */}
            <View className="w-full px-4 py-24 bg-kiitos-black">
                <View className="max-w-7xl mx-auto">
                    <View className="text-center mb-16">
                        <Text className="text-kiitos-orange font-bold text-sm uppercase tracking-widest mb-2">For Diners</Text>
                        <Text className="text-3xl md:text-5xl font-bold text-white">The Best Dining Experience</Text>
                    </View>

                    <View className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <View className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">Apple Pay & Google Pay</Text>
                            <Text className="text-gray-400 text-sm">Integrated for one-tap secure checkout.</Text>
                        </View>
                        <View className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">Digital Receipts</Text>
                            <Text className="text-gray-400 text-sm">Instantly emailed or saved to your gallery.</Text>
                        </View>
                        <View className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">No Account Needed</Text>
                            <Text className="text-gray-400 text-sm">Guest checkout is the default standard.</Text>
                        </View>
                        <View className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                            <Text className="text-kiitos-orange font-bold text-lg mb-2">Loyalty Points</Text>
                            <Text className="text-gray-400 text-sm">Earn rewards automatically with every scan.</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 5. SOCIAL PROOF */}
            <View className="w-full py-16 bg-kiitos-orange relative overflow-hidden">
                <View className="absolute inset-0 bg-black/5 pattern-dots" />
                <View className="max-w-7xl mx-auto px-4 flex-col md:flex-row justify-around items-center gap-8 relative z-10 text-center">
                    <View>
                        <Text className="text-4xl md:text-5xl font-black text-white mb-1">10M+</Text>
                        <Text className="text-white/80 font-medium tracking-wider">HAPPY USERS</Text>
                    </View>
                    <View className="hidden md:block w-px h-16 bg-white/20" />
                    <View>
                        <Text className="text-4xl md:text-5xl font-black text-white mb-1">500+</Text>
                        <Text className="text-white/80 font-medium tracking-wider">RESTAURANTS</Text>
                    </View>
                    <View className="hidden md:block w-px h-16 bg-white/20" />
                    <View>
                        <Text className="text-4xl md:text-5xl font-black text-white mb-1">100%</Text>
                        <Text className="text-white/80 font-medium tracking-wider">SECURE PAYMENTS</Text>
                    </View>
                </View>
            </View>

            {/* 6. FOOTER */}
            <View className="w-full bg-kiitos-black pt-16 pb-8 border-t border-gray-800 px-4">
                <View className="max-w-7xl mx-auto">
                    <View className="flex-col md:flex-row justify-between items-start gap-12 mb-16">
                        <View className="max-w-xs">
                            <Text className="font-bold text-2xl text-white mb-4">Kitos<Text className="text-kiitos-orange">.</Text></Text>
                            <Text className="text-gray-400 leading-relaxed">
                                The operating system for modern restaurants. Speed, efficiency, and better dining experiences.
                            </Text>
                        </View>

                        <View className="flex-row gap-16">
                            <View>
                                <Text className="text-white font-bold mb-4">Product</Text>
                                <View className="space-y-2">
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">For Restaurants</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">For Diners</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">Pricing</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">Request Demo</Text>
                                </View>
                            </View>
                            <View>
                                <Text className="text-white font-bold mb-4">Company</Text>
                                <View className="space-y-2">
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">About Us</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">Careers</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">Blog</Text>
                                    <Text className="text-gray-400 hover:text-white cursor-pointer">Contact</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="border-t border-gray-800 pt-8 flex-col md:flex-row justify-between items-center gap-4">
                        <Text style={{ color: '#444' }}>© 2026 Kitos Inc. All rights reserved.</Text>
                        <View className="flex-row gap-6">
                            <Text className="text-gray-500 text-sm hover:text-white cursor-pointer">Privacy Policy</Text>
                            <Text className="text-gray-500 text-sm hover:text-white cursor-pointer">Terms of Service</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

