import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';

// Icons
const MicOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const MicOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22" /><path d="M10.25 5.25a3 3 0 0 0-3.5 3.5v1.5" /><path d="M8 5a3 3 0 0 1 6 0v7a3 3 0 0 1-.28.88" /><path d="M19 10v2a7 7 0 0 1-11.26 5.8" /><line x1="12" y1="19" x2="12" y2="22" /></svg>;
const VideoOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const VideoOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v-3.27a2.23 2.23 0 0 0-1.07-1.93l-8-5.34A2 2 0 0 0 3 7.27V17a2 2 0 0 0 3.07 1.73l.93-.62M1 1l22 22"></path></svg>;
const EndCallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm1 14.17l3.88 3.88a9.018 9.018 0 0 1-9.76 0l3.88-3.88c.54.34 1.16.55 1.83.55s1.29-.21 1.83-.55zm-7.76-3.88l-3.88 3.88A9.018 9.018 0 0 1 2 12c0-1.83.55-3.54 1.47-4.99l3.88 3.88c-.34.54-.55 1.16-.55 1.83s.21 1.29.55 1.83zm11.64-5.28L3.01 4.12a9.018 9.018 0 0 1 9.76 0l3.88 3.88z"/></svg>;

type CallStatus = 'idle' | 'requesting' | 'connecting' | 'connected' | 'ended' | 'failed';

const STUN_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const CALL_TIMEOUT = 30000; // 30 seconds

const CallScreen: React.FC = () => {
    const { userId: otherUserId, callType } = useParams<{ userId: string; callType: 'video' | 'audio' }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile } = useAuth();

    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [status, setStatus] = useState<CallStatus>('idle');
    const [statusText, setStatusText] = useState('جاري التحضير...');
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const callSignalChannelRef = useRef<any>(null);
    const callRequestChannelRef = useRef<any>(null);
    const timeoutRef = useRef<number | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const isCaller = !location.state?.isReceiving;

    const cleanup = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => track.stop()); localStreamRef.current = null; }
        if (callSignalChannelRef.current) { supabase.removeChannel(callSignalChannelRef.current); callSignalChannelRef.current = null; }
        if (callRequestChannelRef.current) { supabase.removeChannel(callRequestChannelRef.current); callRequestChannelRef.current = null; }
    };

    const hangUp = () => {
        if (!user || !otherUserId) return;
        const channel = supabase.channel(`call-signal-${[user.id, otherUserId].sort().join('-')}`);
        channel.subscribe(() => {
            channel.send({ type: 'broadcast', event: 'hang-up', payload: { from: user.id } });
            supabase.removeChannel(channel);
        });
        cleanup();
        setStatus('ended');
        setStatusText('تم إنهاء المكالمة');
        setTimeout(() => navigate(`/chat/${otherUserId}`), 1500);
    };

    useEffect(() => {
        if (!user || !otherUserId) { navigate('/messages'); return; }

        const init = async () => {
            try {
                const { data: otherUserData } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
                if (!otherUserData) throw new Error('المستخدم غير موجود.');
                setOtherUser(otherUserData);

                const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                const sortedIds = [user.id, otherUserId].sort();
                const signalChannel = supabase.channel(`call-signal-${sortedIds.join('-')}`);
                callSignalChannelRef.current = signalChannel;

                pcRef.current = new RTCPeerConnection(STUN_SERVERS);
                stream.getTracks().forEach(track => pcRef.current!.addTrack(track, stream));

                pcRef.current.onicecandidate = event => {
                    if (event.candidate) {
                        signalChannel.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: event.candidate, from: user.id } });
                    }
                };

                pcRef.current.ontrack = event => {
                    setRemoteStream(event.streams[0]);
                    setStatus('connected');
                    setStatusText(`في مكالمة مع ${otherUserData.full_name}`);
                };
                
                signalChannel.on('broadcast', { event: 'hang-up' }, () => {
                    cleanup(); setStatus('ended'); setStatusText('أنهى الطرف الآخر المكالمة');
                    setTimeout(() => navigate(`/chat/${otherUserId}`), 1500);
                });

                signalChannel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
                    if (payload.from !== user.id) pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
                });
                
                if (isCaller) { // Caller logic
                    setStatus('requesting'); setStatusText(`جاري الاتصال بـ ${otherUserData.full_name}...`);

                    const requestChannel = supabase.channel(`calls-${otherUserId}`);
                    callRequestChannelRef.current = requestChannel;
                    await requestChannel.subscribe();
                    
                    const responseChannel = supabase.channel(`calls-${user.id}`);
                    responseChannel.on('broadcast', { event: 'call-accepted' }, async () => {
                         if (timeoutRef.current) clearTimeout(timeoutRef.current);
                         setStatus('connecting'); setStatusText('جاري الاتصال...');
                         const offer = await pcRef.current!.createOffer();
                         await pcRef.current!.setLocalDescription(offer);
                         signalChannel.send({ type: 'broadcast', event: 'offer', payload: { offer, from: user.id } });
                    });
                     responseChannel.on('broadcast', { event: 'call-declined' }, () => {
                        setStatus('failed'); setStatusText('تم رفض المكالمة'); hangUp();
                    });
                     responseChannel.on('broadcast', { event: 'user-busy' }, () => {
                        setStatus('failed'); setStatusText('المستخدم مشغول في مكالمة أخرى'); hangUp();
                    });
                    await responseChannel.subscribe();

                    requestChannel.send({ type: 'broadcast', event: 'call-request', payload: { caller: profile, callType } });

                    timeoutRef.current = window.setTimeout(() => {
                        setStatus('failed'); setStatusText('لا يوجد رد'); hangUp();
                    }, CALL_TIMEOUT);

                     signalChannel.on('broadcast', { event: 'answer' }, ({ payload }) => {
                        if (payload.from !== user.id) pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    });
                } else { // Receiver logic
                    setStatus('connecting'); setStatusText('جاري الاتصال...');
                    signalChannel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
                        if (payload.from !== user.id) {
                            await pcRef.current!.setRemoteDescription(new RTCSessionDescription(payload.offer));
                            const answer = await pcRef.current!.createAnswer();
                            await pcRef.current!.setLocalDescription(answer);
                            signalChannel.send({ type: 'broadcast', event: 'answer', payload: { answer, from: user.id } });
                        }
                    });
                }

                await signalChannel.subscribe();
                
            } catch (err) {
                setStatus('failed'); setStatusText(`فشل الاتصال: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
                cleanup();
                setTimeout(() => navigate(-1), 2000);
            }
        };

        init();
        return () => { cleanup(); };
    }, [user, otherUserId, callType, navigate, isCaller, profile]);
    
    useEffect(() => {
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }, [remoteStream]);

    const toggleMic = () => { localStreamRef.current?.getAudioTracks().forEach(track => track.enabled = !track.enabled); setIsMicMuted(p => !p); };
    const toggleVideo = () => { localStreamRef.current?.getVideoTracks().forEach(track => track.enabled = !track.enabled); setIsVideoEnabled(p => !p); };

    const showRemoteVideo = status === 'connected' && callType === 'video';
    const showLocalVideo = callType === 'video';

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white relative">
            <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${showRemoteVideo ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${showRemoteVideo ? 'opacity-0' : 'opacity-100'}`}>
                <Avatar url={otherUser?.avatar_url} size={128} />
                <p className="mt-4 text-2xl font-bold">{otherUser?.full_name}</p>
            </div>
            
            <div className="absolute inset-0 bg-black/60"></div>

             {showLocalVideo && (
                <video ref={localVideoRef} autoPlay playsInline muted className={`absolute top-4 right-4 w-32 h-48 sm:w-40 sm:h-56 rounded-lg overflow-hidden border-2 border-slate-700 shadow-lg object-cover transition-opacity duration-500 ${isVideoEnabled ? 'opacity-100' : 'opacity-0'}`} />
            )}

            <div className="relative z-10 flex flex-col h-full p-6 justify-between items-center">
                <div className="text-center bg-black/30 px-4 py-2 rounded-lg">
                    <p className="text-lg text-slate-300">{statusText}</p>
                </div>

                <div className="flex justify-center items-center gap-4 bg-black/30 p-4 rounded-full">
                     <button onClick={toggleMic} className={`p-4 rounded-full transition-colors ${isMicMuted ? 'bg-red-600 text-white' : 'bg-white/20 text-white'}`}>
                        {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
                    </button>
                    {callType === 'video' && (
                        <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${!isVideoEnabled ? 'bg-red-600 text-white' : 'bg-white/20 text-white'}`}>
                           {isVideoEnabled ? <VideoOnIcon /> : <VideoOffIcon />}
                        </button>
                    )}
                     <button onClick={hangUp} className="p-4 rounded-full bg-red-600 text-white">
                        <EndCallIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallScreen;