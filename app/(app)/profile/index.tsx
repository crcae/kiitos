import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Clock, Receipt, Bell, Moon, CircleHelp, ChevronRight, LogOut, Wallet } from 'lucide-react-native';

export default function ProfileScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-stone-50">
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Header */}
                <View className="bg-white pt-20 pb-8 px-6 items-center shadow-sm rounded-b-3xl mb-6">
                    <View className="w-24 h-24 bg-stone-200 rounded-full mb-4 shadow-inner overflow-hidden">
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&q=80' }}
                            className="w-full h-full"
                            style={{ resizeMode: 'cover' }}
                        />
                    </View>
                    <Text className="text-2xl font-bold text-stone-900">Alex Johnson</Text>
                    <Text className="text-stone-500 font-medium">Member since 2025</Text>
                </View>

                {/* Section 1: Wallet */}
                <View className="px-4 mb-6">
                    <Text className="text-lg font-bold text-stone-900 mb-3 ml-2">My Wallet</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1">
                        {/* Saved Card */}
                        <TouchableOpacity className="bg-stone-900 w-72 h-44 rounded-2xl p-6 mr-4 justify-between shadow-md">
                            <View className="flex-row justify-between items-start">
                                <CreditCard color="white" size={24} />
                                <Text className="text-white font-bold text-lg italic">VISA</Text>
                            </View>
                            <View>
                                <Text className="text-stone-400 text-sm mb-1">Card Number</Text>
                                <Text className="text-white font-mono text-xl tracking-widest">•••• 4242</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-stone-400 text-xs">Holder name</Text>
                                <Text className="text-stone-400 text-xs">Expires</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-white font-medium">ALEX JOHNSON</Text>
                                <Text className="text-white font-medium">12/28</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Add New Card */}
                        <TouchableOpacity className="bg-white w-20 h-44 rounded-2xl items-center justify-center border-2 border-dashed border-stone-300 mr-4">
                            <View className="w-10 h-10 rounded-full bg-stone-100 items-center justify-center mb-2">
                                <Text className="text-stone-400 text-2xl">+</Text>
                            </View>
                            <Text className="text-stone-500 text-xs font-bold text-center px-1">Add Method</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Section 2: Activity */}
                <View className="px-4 mb-6">
                    <Text className="text-lg font-bold text-stone-900 mb-3 ml-2">Activity</Text>
                    <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                        <TouchableOpacity className="flex-row items-center p-4 border-b border-stone-100">
                            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                                <Clock size={20} color="#ea580c" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-stone-900 font-bold">Order History</Text>
                                <Text className="text-stone-500 text-xs">View past meals</Text>
                            </View>
                            <ChevronRight size={20} color="#d6d3d1" />
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center p-4">
                            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                <Receipt size={20} color="#2563eb" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-stone-900 font-bold">Transactions</Text>
                                <Text className="text-stone-500 text-xs">Receipts & Invoices</Text>
                            </View>
                            <ChevronRight size={20} color="#d6d3d1" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section 3: Preferences */}
                <View className="px-4 mb-8">
                    <Text className="text-lg font-bold text-stone-900 mb-3 ml-2">Preferences</Text>
                    <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                        <View className="flex-row items-center justify-between p-4 border-b border-stone-100">
                            <View className="flex-row items-center">
                                <Bell size={20} color="#57534e" className="mr-3" />
                                <Text className="text-stone-900 font-medium">Notifications</Text>
                            </View>
                            <Switch value={true} trackColor={{ false: '#e7e5e4', true: '#ea580c' }} />
                        </View>
                        <View className="flex-row items-center justify-between p-4 border-b border-stone-100">
                            <View className="flex-row items-center">
                                <Moon size={20} color="#57534e" className="mr-3" />
                                <Text className="text-stone-900 font-medium">Dark Mode</Text>
                            </View>
                            <Switch value={false} trackColor={{ false: '#e7e5e4', true: '#ea580c' }} />
                        </View>
                        <TouchableOpacity className="flex-row items-center p-4">
                            <View className="flex-row items-center flex-1">
                                <CircleHelp size={20} color="#57534e" className="mr-3" />
                                <Text className="text-stone-900 font-medium">Help & Support</Text>
                            </View>
                            <ChevronRight size={20} color="#d6d3d1" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity className="mx-4 mb-8 bg-red-50 p-4 rounded-xl flex-row justify-center items-center">
                    <LogOut size={20} color="#dc2626" className="mr-2" />
                    <Text className="text-red-600 font-bold">Sign Out</Text>
                </TouchableOpacity>

            </ScrollView>

        </View>
    );
}
