import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { useAuth } from './hooks/useAuth.ts';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import IncomingCallModal from './components/IncomingCallModal.tsx';
import { supabase } from './services/supabase.ts';
import InstallPwaModal from './components/InstallPwaModal.tsx';


// Screen Imports
import LoginScreen from './screens/LoginScreen.tsx';
import SignUpScreen from './screens/SignUpScreen.tsx';
import VerificationScreen from './screens/VerificationScreen.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import AppLayout from './components/AppLayout.tsx';
import PostDetailScreen from './screens/PostDetailScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import EditProfileScreen from './screens/EditProfileScreen.tsx';
import UserScreen from './screens/UserScreen.tsx';
import StoresScreen from './screens/StoresScreen.tsx';
import CreateStoreScreen from './screens/CreateStoreScreen.tsx';
import StoreDetailScreen from './screens/StoreDetailScreen.tsx';
import CreateProductScreen from './screens/CreateProductScreen.tsx';
import ProductDetailScreen from './screens/ProductDetailScreen.tsx';
import MessagesScreen from './screens/MessagesScreen.tsx';
import ChatScreen from './screens/ChatScreen.tsx';
import GroupsScreen from './screens/GroupsScreen.tsx';
import CreateGroupScreen from './screens/CreateGroupScreen.tsx';
import GroupDetailScreen from './screens/GroupDetailScreen.tsx';
import NotificationsScreen from './screens/NotificationsScreen.tsx';
import CallScreen from './screens/CallScreen.tsx';
import FollowersScreen from './screens/FollowersScreen.tsx';
import GroupMembersScreen from './screens/GroupMembersScreen.tsx';
import SearchScreen from './screens/SearchScreen.tsx';
import SuggestionsScreen from './screens/SuggestionsScreen.tsx';
import WatchScreen from './screens/WatchScreen.tsx';
import CurrencyScreen from './screens/CurrencyScreen.tsx';
import HouseRentalsScreen from './screens/HouseRentalsScreen.tsx';
import CreateRentalScreen from './screens/CreateRentalScreen.tsx';
import RentalDetailScreen from './screens/RentalDetailScreen.tsx';
import EditRentalScreen from './screens/EditRentalScreen.tsx';
import AdminDashboardScreen from './screens/AdminDashboardScreen.tsx';
import AdminUserDetailScreen from './screens/AdminUserDetailScreen.tsx';
import AdminReportsScreen from './screens/AdminReportsScreen.tsx';
import SettingsScreen from './screens/SettingsScreen.tsx';
import DisplaySettingsScreen from './screens/DisplaySettingsScreen.tsx';
import ChatSettingsScreen from './screens/ChatSettingsScreen.tsx';
import BlockedUsersScreen from './screens/BlockedUsersScreen.tsx';
import ActivityLogScreen from './screens/ActivityLogScreen.tsx';
import LiveConversationScreen from './screens/LiveConversationScreen.tsx';
import AdminEngagementAIScreen from './screens/AdminEngagementAIScreen.tsx';
import UpdateNotification from './components/UpdateNotification.tsx';
import HelpAndSupportScreen from './screens/HelpAndSupportScreen.tsx';
import AdminSupportTicketsScreen from './screens/AdminSupportTicketsScreen.tsx';
import SupportTicketDetailScreen from './screens/SupportTicketDetailScreen.tsx';
import AdminCurrencyRatesScreen from './screens/AdminCurrencyRatesScreen.tsx';
import { Profile } from './types.ts';

interface IncomingCall {
  caller: Profile;
  callType: 'video' | 'audio';
}

const AppContent: React.FC = () => {
  const { profile, user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        // Only show the prompt if not in standalone mode and if it hasn't been shown this session
        if (!isStandalone && !sessionStorage.getItem('install_prompt_shown')) {
            setInstallPrompt(e);
            // Show the modal after a small delay to not be too intrusive
            setTimeout(() => setShowInstallModal(true), 3000); 
            sessionStorage.setItem('install_prompt_shown', 'true');
        } else if (!isStandalone) {
             setInstallPrompt(e);
        }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Global call listener
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`calls-${user.id}`);
    
    channel.on('broadcast', { event: 'call-request' }, ({ payload }) => {
        // Prevent receiving a call if already in one or getting one
        if (!incomingCall && !window.location.hash.includes('/call/')) {
             setIncomingCall({ caller: payload.caller, callType: payload.callType });
        } else {
            // Send busy signal
            const busyChannel = supabase.channel(`calls-${payload.caller.id}`);
            busyChannel.subscribe(() => {
                busyChannel.send({
                    type: 'broadcast',
                    event: 'user-busy',
                    payload: { from: user.id }
                });
                supabase.removeChannel(busyChannel);
            });
        }
    });
    
     channel.on('broadcast', { event: 'call-cancelled' }, () => {
        setIncomingCall(null);
    });

    channel.subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [user, incomingCall]);
  
  const handleAcceptCall = () => {
    if (!incomingCall || !user) return;
    
    const { caller, callType } = incomingCall;

    // Notify the caller that the call was accepted
    const callerChannel = supabase.channel(`calls-${caller.id}`);
    callerChannel.subscribe(() => {
        callerChannel.send({
            type: 'broadcast',
            event: 'call-accepted',
            payload: { acceptor: profile }
        });
         supabase.removeChannel(callerChannel);
    });
    
    setIncomingCall(null);
    navigate(`/call/${callType}/${caller.id}`, { state: { isReceiving: true } });
  };

  const handleDeclineCall = () => {
     if (!incomingCall || !user) return;
     const { caller } = incomingCall;

     // Notify the caller that the call was declined
     const callerChannel = supabase.channel(`calls-${caller.id}`);
     callerChannel.subscribe(() => {
        callerChannel.send({
            type: 'broadcast',
            event: 'call-declined',
            payload: { from: user.id }
        });
        supabase.removeChannel(callerChannel);
    });

    setIncomingCall(null);
  };

  return (
    <>
      {incomingCall && (
        <IncomingCallModal 
            caller={incomingCall.caller}
            callType={incomingCall.callType}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
        />
      )}
      {showInstallModal && installPrompt && (
        <InstallPwaModal
            installPrompt={installPrompt}
            onClose={() => setShowInstallModal(false)}
        />
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/verify" element={<VerificationScreen />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><AppLayout installPrompt={installPrompt} /></ProtectedRoute>}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/stores" element={<StoresScreen />} />
          <Route path="/groups" element={<GroupsScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/rentals" element={<HouseRentalsScreen />} />
          <Route path="/watch" element={<WatchScreen />} />
          <Route path="/watch/:postId" element={<WatchScreen />} />
        </Route>
        
        <Route path="/post/:postId" element={<ProtectedRoute><PostDetailScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><UserScreen /></ProtectedRoute>} />
        <Route path="/user/:userId/:followType" element={<ProtectedRoute><FollowersScreen /></ProtectedRoute>} />
        
        <Route path="/stores/new" element={<ProtectedRoute><CreateStoreScreen /></ProtectedRoute>} />
        <Route path="/store/:storeId" element={<ProtectedRoute><StoreDetailScreen /></ProtectedRoute>} />
        <Route path="/store/:storeId/products/new" element={<ProtectedRoute><CreateProductScreen /></ProtectedRoute>} />
        <Route path="/product/:productId" element={<ProtectedRoute><ProductDetailScreen /></ProtectedRoute>} />
        
        <Route path="/messages" element={<ProtectedRoute><MessagesScreen /></ProtectedRoute>} />
        <Route path="/chat/:userId" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
        
        <Route path="/groups/new" element={<ProtectedRoute><CreateGroupScreen /></ProtectedRoute>} />
        <Route path="/group/:groupId" element={<ProtectedRoute><GroupDetailScreen /></ProtectedRoute>} />
        <Route path="/group/:groupId/members" element={<ProtectedRoute><GroupMembersScreen /></ProtectedRoute>} />
        
        <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
        <Route path="/call/:callType/:userId" element={<ProtectedRoute><CallScreen /></ProtectedRoute>} />
        <Route path="/suggestions" element={<ProtectedRoute><SuggestionsScreen /></ProtectedRoute>} />
        <Route path="/live-conversation" element={<ProtectedRoute><LiveConversationScreen /></ProtectedRoute>} />
        <Route path="/rates" element={<ProtectedRoute><CurrencyScreen /></ProtectedRoute>} />
        
        <Route path="/rentals/new" element={<ProtectedRoute><CreateRentalScreen /></ProtectedRoute>} />
        <Route path="/rental/:rentalId" element={<ProtectedRoute><RentalDetailScreen /></ProtectedRoute>} />
        <Route path="/rental/:rentalId/edit" element={<ProtectedRoute><EditRentalScreen /></ProtectedRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
        <Route path="/settings/display" element={<ProtectedRoute><DisplaySettingsScreen /></ProtectedRoute>} />
        <Route path="/settings/chat" element={<ProtectedRoute><ChatSettingsScreen /></ProtectedRoute>} />
        <Route path="/settings/chat/blocked" element={<ProtectedRoute><BlockedUsersScreen /></ProtectedRoute>} />
        <Route path="/activity-log" element={<ProtectedRoute><ActivityLogScreen /></ProtectedRoute>} />
        <Route path="/help-support" element={<ProtectedRoute><HelpAndSupportScreen /></ProtectedRoute>} />
        <Route path="/support/ticket/:ticketId" element={<ProtectedRoute><SupportTicketDetailScreen /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboardScreen /></ProtectedRoute>} />
        <Route path="/admin/user/:userId" element={<ProtectedRoute><AdminUserDetailScreen /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute><AdminReportsScreen /></ProtectedRoute>} />
        <Route path="/admin/engagement-ai" element={<ProtectedRoute><AdminEngagementAIScreen /></ProtectedRoute>} />
        <Route path="/admin/support-tickets" element={<ProtectedRoute><AdminSupportTicketsScreen /></ProtectedRoute>} />
        <Route path="/admin/currency-rates" element={<ProtectedRoute><AdminCurrencyRatesScreen /></ProtectedRoute>} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <UpdateNotification />
    </>
  );
};


const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;