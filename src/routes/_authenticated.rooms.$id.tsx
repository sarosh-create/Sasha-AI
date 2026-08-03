import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Send, Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { awardBadge } from "@/lib/gamification";
import { toast } from "sonner";
import { EmptyState, PageLoading } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/rooms/$id")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("study_rooms")
        .select("name, topic")
        .eq("id", params.id)
        .maybeSingle();
      return { name: (data as any)?.name ?? null, topic: (data as any)?.topic ?? null };
    } catch {
      return { name: null, topic: null };
    }
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.name?.trim();
    const title = name ? `${name} — Sasha AI study room` : "Study room — Sasha AI";
    const description = name
      ? `Join the ${name} study room${loaderData?.topic ? ` (${loaderData.topic})` : ""} to focus, chat and revise with other students.`
      : "Focus, chat and revise together inside a live study room.";
    return {
      meta: [
        { title: title.slice(0, 60) },
        { name: "description", content: description },
        { property: "og:title", content: title.slice(0, 60) },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://study-mentor-by-sarosh-ai.lovable.app/rooms/${params.id}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: `https://study-mentor-by-sarosh-ai.lovable.app/rooms/${params.id}` },
      ],
    };
  },
  component: RoomPage,
});


type Msg = { id: string; user_id: string; display_name: string | null; content: string; created_at: string };
type Participant = { user_id: string; display_name: string | null };

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function RoomPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<{ name: string; subject: string | null } | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [input, setInput] = useState("");
  const [displayName, setDisplayName] = useState<string>("");
  const [videoOn, setVideoOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const sigChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      const { data: r } = await supabase.from("study_rooms").select("name, subject").eq("id", id).maybeSingle();
      if (!active) return;
      if (!r) { toast.error("Room not found"); nav({ to: "/rooms" }); return; }
      setRoom(r);
      setLoadingRoom(false);

      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const dn = p?.display_name ?? user.email?.split("@")[0] ?? "Student";
      setDisplayName(dn);

      // Upsert participant
      await supabase.from("room_participants").upsert(
        { room_id: id, user_id: user.id, display_name: dn },
        { onConflict: "room_id,user_id" },
      );
      await awardBadge(user.id, "room_joiner");

      // Initial loads
      const { data: msgs } = await supabase.from("room_messages").select("*").eq("room_id", id).order("created_at").limit(200);
      const { data: parts } = await supabase.from("room_participants").select("user_id, display_name").eq("room_id", id);
      if (!active) return;
      setMessages((msgs as Msg[]) ?? []);
      setParticipants((parts as Participant[]) ?? []);
      setMessagesLoading(false);

      // Realtime: messages + participants
      const dataChannel = supabase
        .channel(`room-data-${id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${id}` },
          (payload) => setMessages((m) => [...m, payload.new as Msg]))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_participants", filter: `room_id=eq.${id}` },
          (payload) => setParticipants((p) => {
            const np = payload.new as Participant;
            return p.find((x) => x.user_id === np.user_id) ? p : [...p, np];
          }))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_participants", filter: `room_id=eq.${id}` },
          (payload) => setParticipants((p) => p.filter((x) => x.user_id !== (payload.old as any).user_id)))
        .subscribe();

      // Signalling channel (broadcast)
      const sig = supabase.channel(`room-sig-${id}`, { config: { broadcast: { self: false } } });
      sig.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const { from, to, kind, data } = payload as any;
        if (to !== user.id) return;
        const pc = ensurePeer(from);
        if (kind === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          sig.send({ type: "broadcast", event: "signal", payload: { from: user.id, to: from, kind: "answer", data: ans } });
        } else if (kind === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (kind === "ice") {
          try { await pc.addIceCandidate(new RTCIceCandidate(data)); } catch {}
        } else if (kind === "hello") {
          // Someone joined; if we have video, initiate offer to them
          if (localStreamRef.current) {
            const pc2 = ensurePeer(from);
            const offer = await pc2.createOffer();
            await pc2.setLocalDescription(offer);
            sig.send({ type: "broadcast", event: "signal", payload: { from: user.id, to: from, kind: "offer", data: offer } });
          }
        }
      });
      sig.subscribe();
      sigChannelRef.current = sig;

      return () => {
        supabase.removeChannel(dataChannel);
      };
    })();

    return () => {
      active = false;
      // Leave room
      if (user) supabase.from("room_participants").delete().eq("room_id", id).eq("user_id", user.id);
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (sigChannelRef.current) supabase.removeChannel(sigChannelRef.current);
    };
  }, [id, user]);

  useEffect(() => {
    msgScrollRef.current?.scrollTo({ top: msgScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function ensurePeer(remoteId: string): RTCPeerConnection {
    if (peersRef.current[remoteId]) return peersRef.current[remoteId];
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => {
      if (e.candidate && sigChannelRef.current && user) {
        sigChannelRef.current.send({
          type: "broadcast", event: "signal",
          payload: { from: user.id, to: remoteId, kind: "ice", data: e.candidate.toJSON() },
        });
      }
    };
    pc.ontrack = (e) => {
      setRemoteStreams((rs) => ({ ...rs, [remoteId]: e.streams[0] }));
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    }
    peersRef.current[remoteId] = pc;
    return pc;
  }

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setVideoOn(true);
      // Add tracks to existing peers
      Object.entries(peersRef.current).forEach(([_id, pc]) => {
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      });
      // Say hello to others so they initiate offers back
      if (sigChannelRef.current && user) {
        participants.filter((p) => p.user_id !== user.id).forEach((p) => {
          sigChannelRef.current!.send({
            type: "broadcast", event: "signal",
            payload: { from: user.id, to: p.user_id, kind: "hello" },
          });
        });
      }
    } catch (e: any) {
      toast.error("Could not start camera: " + e.message);
    }
  };

  const stopVideo = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setVideoOn(false);
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
  };

  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const sendMsg = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    await supabase.from("room_messages").insert({
      room_id: id, user_id: user.id, display_name: displayName, content,
    });
  };

  if (loadingRoom) return <PageLoading label="Loading room…" />;

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col md:h-[calc(100dvh-3rem)]">
      <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/rooms" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <p className="font-display font-semibold">{room?.name ?? "Room"}</p>
            {room?.subject && <p className="text-xs text-muted-foreground">{room.subject}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!videoOn ? (
            <Button size="sm" onClick={startVideo}><Video className="h-4 w-4" /> Join video</Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={toggleMic}>{micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</Button>
              <Button size="sm" variant="destructive" onClick={stopVideo}><PhoneOff className="h-4 w-4" /> Leave call</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 overflow-y-auto bg-muted/30 p-3">
          {!videoOn && Object.keys(remoteStreams).length === 0 ? (
            <div className="grid h-full place-items-center text-center text-muted-foreground">
              <div>
                <VideoOff className="mx-auto mb-2 h-8 w-8" />
                <p className="text-sm">Video is off. Click "Join video" to share your camera.</p>
                <p className="mt-1 text-xs">Free P2P video — works best on the same network type.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {videoOn && (
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                  <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">You</span>
                </div>
              )}
              {Object.entries(remoteStreams).map(([uid, stream]) => (
                <RemoteTile key={uid} stream={stream} label={participants.find((p) => p.user_id === uid)?.display_name ?? "Student"} />
              ))}
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <aside className="hidden w-80 flex-col border-l border-border bg-background md:flex">
          <div className="border-b border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">In room ({participants.length})</p>
            <ul className="mt-2 flex flex-wrap gap-1">
              {participants.map((p) => (
                <li key={p.user_id} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{p.display_name ?? "Student"}</li>
              ))}
            </ul>
          </div>
          <div ref={msgScrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messagesLoading ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-10 w-3/4 rounded-2xl" />
                <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                icon={<MessageCircle className="h-6 w-6" />}
                title="No messages yet"
                description="Say hi to get the conversation going."
                className="border-none bg-transparent p-3"
              />
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.user_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                  <p className="text-[10px] opacity-70">{m.display_name ?? "Student"}</p>
                  <p>{m.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border p-2">
            <div className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }} placeholder="Say hi…" />
              <Button onClick={sendMsg} size="icon"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RemoteTile({ stream, label }: { stream: MediaStream; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{label}</span>
    </div>
  );
}
