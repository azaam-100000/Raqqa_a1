import React, { useState, useEffect } from 'react';
// FIX: Added missing 'useNavigate' hook to imports from react-router-dom.
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
// FIX: 'AuthProvider' is exported from 'contexts/AuthContext', not 'hooks/useAuth'.
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionsWizard from './components/PermissionsWizard';
import ProfileCompletionWizard from './components/ProfileCompletionWizard';
import IncomingCallModal from './components/IncomingCallModal';
import { supabase } from './services/supabase';


// Screen Imports
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import VerificationScreen from './screens/VerificationScreen';
import HomeScreen from './screens/HomeScreen';
import AppLayout from './components/AppLayout';
import PostDetailScreen from './screens/PostDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import UserScreen from './screens/UserScreen';
import StoresScreen from './screens/StoresScreen';
import CreateStoreScreen from './screens/CreateStoreScreen';
import StoreDetailScreen from './screens/StoreDetailScreen';
import CreateProductScreen from './screens/CreateProductScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import MessagesScreen from './screens/MessagesScreen';
import ChatScreen from './screens/ChatScreen';
import GroupsScreen from './screens/GroupsScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import CallScreen from './screens/CallScreen';
import FollowersScreen from './screens/FollowersScreen';
import GroupMembersScreen from './screens/GroupMembersScreen';
import SearchScreen from './screens/SearchScreen';
import SuggestionsScreen from './screens/SuggestionsScreen';
import WatchScreen from './screens/WatchScreen';
import SalesAssistantScreen from './screens/SalesAssistantScreen';
import CurrencyScreen from './screens/CurrencyScreen';
import HouseRentalsScreen from './screens/HouseRentalsScreen';
import CreateRentalScreen from './screens/CreateRentalScreen';
import RentalDetailScreen from './screens/RentalDetailScreen';
import EditRentalScreen from './screens/EditRentalScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminUserDetailScreen from './screens/AdminUserDetailScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import DisplaySettingsScreen from './screens/DisplaySettingsScreen';
import ChatSettingsScreen from './screens/ChatSettingsScreen';
import BlockedUsersScreen from './screens/BlockedUsersScreen';
import ActivityLogScreen from './screens/ActivityLogScreen';
import LiveConversationScreen from './screens/LiveConversationScreen';
import AdminEngagementAIScreen from './screens/AdminEngagementAIScreen';
import UpdateNotification from './components/UpdateNotification';
import HelpAndSupportScreen from './screens/HelpAndSupportScreen';
import AdminSupportTicketsScreen from './screens/AdminSupportTicketsScreen';
import SupportTicketDetailScreen from './screens/SupportTicketDetailScreen';
import { Profile } from './types';

interface IncomingCall {
  caller: Profile;
  callType: 'video' | 'audio';
}

const AppContent: React.FC = () => {
  const [showPermissionsWizard, setShowPermissionsWizard] = useState(false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const { profile, loading, user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const permissionsRequested = localStorage.getItem('permissions_requested');
    if (!permissionsRequested) {
      setTimeout(() => setShowPermissionsWizard(true), 500);
    }
  }, []);

  useEffect(() => {
    if (profile && !loading) {
        const isComplete = profile.avatar_url && profile.cover_photo_url && profile.bio && profile.bio.trim() !== '';
        const lastSkipped = localStorage.getItem('profile_wizard_skipped_at');
        const oneDay = 24 * 60 * 60 * 1000;

        if (!isComplete && (!lastSkipped || (Date.now() - parseInt(lastSkipped, 10)) > oneDay)) {
            setTimeout(() => {
              if (!localStorage.getItem('permissions_requested')) return; // Don't show if permission wizard is still up
              setShowProfileWizard(true)
            }, 2000); // Delay to avoid immediate popup on login
        }
    }
  }, [profile, loading]);

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


  const handlePermissionsFinish = () => {
    localStorage.setItem('permissions_requested', 'true');
    setShowPermissionsWizard(false);
  };

  const handleProfileWizardFinish = () => {
    localStorage.setItem('profile_wizard_skipped_at', Date.now().toString());
    setShowProfileWizard(false);
  };
  
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
      {showPermissionsWizard && <PermissionsWizard onFinish={handlePermissionsFinish} />}
      {showProfileWizard && <ProfileCompletionWizard onFinish={handleProfileWizardFinish} />}
      {incomingCall && (
        <IncomingCallModal 
            caller={incomingCall.caller}
            callType={incomingCall.callType}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
        />
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/verify" element={<VerificationScreen />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
        <Route path="/sales-assistant" element={<ProtectedRoute><SalesAssistantScreen /></ProtectedRoute>} />
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
